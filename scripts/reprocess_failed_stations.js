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
  
  // 여러 주소 변형을 시도
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
        // 가장 적합한 결과 선택
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

async function reprocessFailedStations() {
  try {
    console.log('🔍 Loading existing data...');
    
    // 가장 최신 부분 파일 찾기
    const dataDir = path.join(__dirname, '..', 'public', 'data');
    const files = fs.readdirSync(dataDir);
    const partialFiles = files.filter(f => f.startsWith('polling_stations_partial_'))
      .sort((a, b) => {
        const aNum = parseInt(a.match(/\d+/)[0]);
        const bNum = parseInt(b.match(/\d+/)[0]);
        return bNum - aNum; // 내림차순 정렬
      });
    
    if (partialFiles.length === 0) {
      throw new Error('No partial files found');
    }
    
    const latestFile = partialFiles[0];
    console.log(`📁 Using latest file: ${latestFile}`);
    
    const filePath = path.join(dataDir, latestFile);
    const existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    console.log(`📊 Total stations in file: ${existingData.length}`);
    
    // 실패한 투표소들 찾기 (geocoded_address가 null인 것들)
    const failedStations = existingData.filter(station => !station.geocoded_address);
    console.log(`❌ Failed stations found: ${failedStations.length}`);
    
    if (failedStations.length === 0) {
      console.log('🎉 No failed stations to reprocess!');
      return;
    }
    
    console.log(`🚀 Starting reprocessing of ${failedStations.length} failed stations...\n`);
    
    let reprocessed = 0;
    let newSuccesses = 0;
    let stillFailed = 0;
    
    // 각 실패한 투표소를 재처리
    for (let i = 0; i < failedStations.length; i++) {
      const station = failedStations[i];
      
      // 주소에서 시도, 구시군, 동 분리
      const addressParts = station.address.split(' ');
      const sido = addressParts[0] || '';
      const sigungu = addressParts[1] || '';
      const dong = addressParts.slice(2).join(' ') || '';
      
      console.log(`🔍 [${i + 1}/${failedStations.length}] Reprocessing: ${station.name}`);
      console.log(`    Address: ${station.address}`);
      
      const geocodeResult = await improvedGeocode(sido, sigungu, dong, station.name);
      
      if (geocodeResult) {
        // 성공한 경우 원본 데이터 업데이트
        const originalIndex = existingData.findIndex(s => s.id === station.id);
        if (originalIndex !== -1) {
          existingData[originalIndex].coordinates = {
            lat: geocodeResult.lat,
            lng: geocodeResult.lng
          };
          existingData[originalIndex].geocoded_address = geocodeResult.display_name;
          existingData[originalIndex].matched_address = geocodeResult.matched_address;
          existingData[originalIndex].geocode_attempt = geocodeResult.attempt;
          existingData[originalIndex].reprocessed = true;
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
        console.log(`\n📊 Reprocessing Progress: ${reprocessed}/${failedStations.length}`);
        console.log(`New successes: ${newSuccesses}, Still failed: ${stillFailed}`);
        console.log(`Improvement rate: ${((newSuccesses / reprocessed) * 100).toFixed(1)}%\n`);
      }
    }
    
    // 결과 저장
    const outputFileName = latestFile.replace('partial', 'reprocessed');
    const outputPath = path.join(dataDir, outputFileName);
    fs.writeFileSync(outputPath, JSON.stringify(existingData, null, 2));
    
    // 통계 계산
    const totalStations = existingData.length;
    const totalSuccessful = existingData.filter(s => s.geocoded_address).length;
    const finalSuccessRate = ((totalSuccessful / totalStations) * 100).toFixed(1);
    
    console.log('\n🎉 === REPROCESSING COMPLETE ===');
    console.log(`📁 Updated data saved to: ${outputPath}`);
    console.log(`🔄 Reprocessed: ${reprocessed} stations`);
    console.log(`✅ New successes: ${newSuccesses}`);
    console.log(`❌ Still failed: ${stillFailed}`);
    console.log(`📈 Improvement rate: ${((newSuccesses / reprocessed) * 100).toFixed(1)}%`);
    console.log(`🎯 Final success rate: ${finalSuccessRate}% (${totalSuccessful}/${totalStations})`);
    
    // 여전히 실패한 것들 분석
    const remainingFailed = existingData.filter(s => !s.geocoded_address);
    if (remainingFailed.length > 0) {
      console.log(`\n❌ Still failed stations (${remainingFailed.length}):`);
      const failedByDistrict = {};
      remainingFailed.forEach(station => {
        const district = station.district || '알 수 없음';
        if (!failedByDistrict[district]) {
          failedByDistrict[district] = [];
        }
        failedByDistrict[district].push(station.name);
      });
      
      Object.entries(failedByDistrict).forEach(([district, stations]) => {
        console.log(`  ${district}: ${stations.length} stations`);
        if (stations.length <= 5) {
          stations.forEach(name => console.log(`    - ${name}`));
        }
      });
    }
    
    // 백업 파일 생성
    const backupPath = path.join(dataDir, `reprocessed_backup_${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(existingData, null, 2));
    console.log(`\n💾 Backup saved to: ${backupPath}`);
    
  } catch (error) {
    console.error('❌ Error during reprocessing:', error);
  }
}

console.log('🔄 Starting failed stations reprocessing...');
console.log('📈 Using improved geocoding with address normalization');
console.log('⏱️ This will process only the failed stations from existing data\n');

reprocessFailedStations(); 