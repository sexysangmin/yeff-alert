const fs = require('fs');
const path = require('path');

// 주소 정규화 함수 (개선된 버전)
function normalizeAddress(sido, sigungu, dong) {
  let baseAddress = `${sido} ${sigungu}`;
  
  // "제X동" 패턴 처리
  let normalizedDong = dong;
  if (dong.includes('제') && dong.includes('동')) {
    normalizedDong = dong.replace(/제\d+동/, '동');
    if (normalizedDong.endsWith('동동')) {
      normalizedDong = normalizedDong.slice(0, -1);
    }
  }
  
  // 특수 문자 정리
  normalizedDong = normalizedDong.replace(/·/g, '');
  
  return [
    `${baseAddress} ${dong}`,           // 원본 주소
    `${baseAddress} ${normalizedDong}`, // 정규화된 주소
    `${baseAddress}`,                   // 구 단위 주소
    sido                                // 시도 단위 주소
  ];
}

// 개선된 Geocoding 함수
async function improvedGeocode(sido, sigungu, dong, stationName) {
  const addressVariations = normalizeAddress(sido, sigungu, dong);
  
  for (let i = 0; i < addressVariations.length; i++) {
    const address = addressVariations[i];
    
    try {
      const encodedAddress = encodeURIComponent(address);
      const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&addressdetails=1&limit=3&countrycodes=kr`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'YEFF-Alert-Polling-Station-Monitor/1.0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data.find(item => 
          item.display_name.includes(sido) && 
          item.display_name.includes(sigungu)
        ) || data[0];
        
        return {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          display_name: result.display_name,
          matched_address: address,
          attempt: i + 1
        };
      }
      
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.log(`    Error with ${address}: ${error.message}`);
    }
  }
  
  return null;
}

// 딜레이 함수
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function reprocessRangeFailed() {
  try {
    console.log('🔍 Loading data files...');
    
    const dataDir = path.join(__dirname, '..', 'public', 'data');
    
    // 1. 최신 전체 데이터 로드 (1700개)
    const latestPath = path.join(dataDir, 'polling_stations_partial_1700.json');
    const latestData = JSON.parse(fs.readFileSync(latestPath, 'utf8'));
    console.log(`📁 Loaded latest data: ${latestData.length} stations`);
    
    // 2. 이미 재처리된 900개 데이터 로드
    const reprocessedPath = path.join(dataDir, 'polling_stations_reprocessed_900.json');
    const reprocessedData = JSON.parse(fs.readFileSync(reprocessedPath, 'utf8'));
    console.log(`📁 Loaded reprocessed data: ${reprocessedData.length} stations`);
    
    // 3. 901~1700 범위의 데이터 추출 (인덱스 900~1699)
    const rangeData = latestData.slice(900, 1700);
    console.log(`📊 Range data (901-1700): ${rangeData.length} stations`);
    
    // 4. 범위 내에서 실패한 투표소들 찾기
    const failedInRange = rangeData.filter(station => !station.geocoded_address);
    console.log(`❌ Failed in range: ${failedInRange.length} stations`);
    
    if (failedInRange.length === 0) {
      console.log('🎉 No failed stations in this range!');
      return;
    }
    
    // 5. 성공률 계산
    const successInRange = rangeData.length - failedInRange.length;
    const currentRate = ((successInRange / rangeData.length) * 100).toFixed(1);
    console.log(`📈 Current success rate in range: ${currentRate}% (${successInRange}/${rangeData.length})`);
    
    console.log(`\n🚀 Starting reprocessing of ${failedInRange.length} failed stations in range 901-1700...\n`);
    
    let reprocessed = 0;
    let newSuccesses = 0;
    let stillFailed = 0;
    
    // 6. 각 실패한 투표소를 재처리
    for (let i = 0; i < failedInRange.length; i++) {
      const station = failedInRange[i];
      
      // 주소에서 시도, 구시군, 동 분리
      const addressParts = station.address.split(' ');
      const sido = addressParts[0] || '';
      const sigungu = addressParts[1] || '';
      const dong = addressParts.slice(2).join(' ') || '';
      
      // 원본 데이터에서의 인덱스 찾기
      const originalIndex = latestData.findIndex(s => s.id === station.id);
      const stationNumber = originalIndex + 1;
      
      console.log(`🔍 [${i + 1}/${failedInRange.length}] Reprocessing #${stationNumber}: ${station.name}`);
      console.log(`    Address: ${station.address}`);
      
      const geocodeResult = await improvedGeocode(sido, sigungu, dong, station.name);
      
      if (geocodeResult) {
        // 성공한 경우 원본 데이터 업데이트
        if (originalIndex !== -1) {
          latestData[originalIndex].coordinates = {
            lat: geocodeResult.lat,
            lng: geocodeResult.lng
          };
          latestData[originalIndex].geocoded_address = geocodeResult.display_name;
          latestData[originalIndex].matched_address = geocodeResult.matched_address;
          latestData[originalIndex].geocode_attempt = geocodeResult.attempt;
          latestData[originalIndex].reprocessed_range = `901-1700`;
        }
        
        newSuccesses++;
        console.log(`  ✅ SUCCESS: ${geocodeResult.lat}, ${geocodeResult.lng} (attempt ${geocodeResult.attempt})`);
      } else {
        stillFailed++;
        console.log(`  ❌ Still failed`);
      }
      
      reprocessed++;
      
      // API 요청 제한을 위한 딜레이
      await delay(1500);
      
      // 20개마다 진행 상황 출력
      if (reprocessed % 20 === 0) {
        console.log(`\n📊 Range Reprocessing Progress: ${reprocessed}/${failedInRange.length}`);
        console.log(`New successes: ${newSuccesses}, Still failed: ${stillFailed}`);
        console.log(`Improvement rate: ${((newSuccesses / reprocessed) * 100).toFixed(1)}%\n`);
      }
    }
    
    // 7. 최종 결과 합치기 (1-900 재처리 결과 + 901-1700 재처리 결과)
    console.log('\n🔧 Merging with previous reprocessed data...');
    
    // 1-900 재처리된 데이터로 교체
    for (let i = 0; i < 900; i++) {
      if (i < reprocessedData.length) {
        latestData[i] = reprocessedData[i];
      }
    }
    
    // 8. 결과 저장
    const outputPath = path.join(dataDir, 'polling_stations_reprocessed_1700.json');
    fs.writeFileSync(outputPath, JSON.stringify(latestData, null, 2));
    
    // 9. 최종 통계 계산
    const totalStations = latestData.length;
    const totalSuccessful = latestData.filter(s => s.geocoded_address).length;
    const finalSuccessRate = ((totalSuccessful / totalStations) * 100).toFixed(1);
    
    console.log('\n🎉 === RANGE REPROCESSING COMPLETE ===');
    console.log(`📁 Combined data saved to: polling_stations_reprocessed_1700.json`);
    console.log(`🔄 Range reprocessed (901-1700): ${reprocessed} stations`);
    console.log(`✅ New successes in range: ${newSuccesses}`);
    console.log(`❌ Still failed in range: ${stillFailed}`);
    console.log(`📈 Range improvement rate: ${((newSuccesses / reprocessed) * 100).toFixed(1)}%`);
    console.log(`🎯 Final overall success rate: ${finalSuccessRate}% (${totalSuccessful}/${totalStations})`);
    
    // 10. 범위별 성공률 표시
    const range1to900 = latestData.slice(0, 900);
    const range901to1700 = latestData.slice(900, 1700);
    
    const success1to900 = range1to900.filter(s => s.geocoded_address).length;
    const success901to1700 = range901to1700.filter(s => s.geocoded_address).length;
    
    console.log('\n📊 Success rates by range:');
    console.log(`  1-900: ${success1to900}/900 (${((success1to900/900)*100).toFixed(1)}%)`);
    console.log(`  901-1700: ${success901to1700}/800 (${((success901to1700/800)*100).toFixed(1)}%)`);
    
    // 백업 파일 생성
    const backupPath = path.join(dataDir, `range_reprocessed_backup_${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(latestData, null, 2));
    console.log(`\n💾 Backup saved to: ${backupPath}`);
    
  } catch (error) {
    console.error('❌ Error during range reprocessing:', error);
  }
}

console.log('🔄 Starting range-based failed stations reprocessing...');
console.log('📍 Target range: 901-1700 (800 stations)');
console.log('🔗 Will merge with existing 1-900 reprocessed data');
console.log('📈 Using improved geocoding with address normalization\n');

reprocessRangeFailed(); 