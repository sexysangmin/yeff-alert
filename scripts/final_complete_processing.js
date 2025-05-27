const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// 주소 정규화 함수
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
      
      await new Promise(resolve => setTimeout(resolve, 300)); // 짧은 딜레이
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

async function processAllStationsComplete() {
  const startTime = Date.now();
  
  try {
    console.log('🚀 Starting COMPLETE polling station processing...');
    console.log('📖 Reading Excel file...');
    
    const workbook = XLSX.readFile('list.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`📊 Found ${rawData.length} total polling stations`);
    console.log(`⏱️ Estimated completion time: ${Math.ceil(rawData.length * 1.5 / 60)} minutes\n`);
    
    const pollingStations = [];
    let successCount = 0;
    let failCount = 0;
    let districtStats = {};
    
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      
      const station = {
        id: `station_${i + 1}`,
        name: row['사전투표소명'] || row['투표소명'] || `투표소_${i + 1}`,
        district: row['시도'] || '알 수 없음',
        sido: row['시도'],
        sigungu: row['구시군명'],
        dong: row['읍면동명'],
        address: `${row['시도']} ${row['구시군명']} ${row['읍면동명']}`.trim(),
        coordinates: null,
        isActive: false,
        entryCount: 0,
        exitCount: 0,
        lastUpdated: new Date().toISOString(),
        alerts: [],
        youtubeUrls: {
          morning: '',
          afternoon: ''
        }
      };
      
      // 지역별 통계 초기화
      if (!districtStats[station.district]) {
        districtStats[station.district] = { total: 0, success: 0, failed: 0 };
      }
      districtStats[station.district].total++;
      
      console.log(`🔍 [${i + 1}/${rawData.length}] ${station.name}`);
      
      const geocodeResult = await improvedGeocode(
        station.sido, 
        station.sigungu, 
        station.dong, 
        station.name
      );
      
      if (geocodeResult) {
        station.coordinates = {
          lat: geocodeResult.lat,
          lng: geocodeResult.lng
        };
        station.geocoded_address = geocodeResult.display_name;
        station.matched_address = geocodeResult.matched_address;
        station.geocode_attempt = geocodeResult.attempt;
        successCount++;
        districtStats[station.district].success++;
        console.log(`  ✅ ${geocodeResult.lat}, ${geocodeResult.lng} (attempt ${geocodeResult.attempt})`);
      } else {
        station.coordinates = {
          lat: 37.5665,
          lng: 126.9780
        };
        station.geocoded_address = null;
        failCount++;
        districtStats[station.district].failed++;
        console.log(`  ❌ Failed`);
      }
      
      pollingStations.push(station);
      
      // API 요청 제한을 위한 딜레이 (1.5초)
      await delay(1500);
      
      // 100개마다 진행 상황 저장 및 출력
      if ((i + 1) % 100 === 0) {
        const elapsedTime = (Date.now() - startTime) / 1000 / 60; // 분
        const avgTimePerStation = elapsedTime / (i + 1);
        const remainingStations = rawData.length - (i + 1);
        const estimatedRemaining = (remainingStations * avgTimePerStation).toFixed(1);
        
        console.log(`\n📊 === Progress Update ===`);
        console.log(`Processed: ${i + 1}/${rawData.length} (${((i + 1) / rawData.length * 100).toFixed(1)}%)`);
        console.log(`Success: ${successCount}, Failed: ${failCount}`);
        console.log(`Success rate: ${((successCount / (i + 1)) * 100).toFixed(1)}%`);
        console.log(`Elapsed: ${elapsedTime.toFixed(1)}min, Remaining: ~${estimatedRemaining}min`);
        
        // 중간 저장
        const partialPath = path.join(__dirname, '..', 'public', 'data', `polling_stations_progress_${i + 1}.json`);
        fs.writeFileSync(partialPath, JSON.stringify(pollingStations, null, 2));
        console.log(`Saved: ${partialPath}\n`);
      }
      
      // 500개마다 상세 통계 출력
      if ((i + 1) % 500 === 0) {
        console.log(`\n🗺️ District Statistics (so far):`);
        Object.entries(districtStats).forEach(([district, stats]) => {
          const rate = ((stats.success / stats.total) * 100).toFixed(1);
          console.log(`  ${district}: ${stats.success}/${stats.total} (${rate}%)`);
        });
        console.log('');
      }
    }
    
    const totalTime = (Date.now() - startTime) / 1000 / 60; // 분
    
    // 최종 결과 저장
    const finalPath = path.join(__dirname, '..', 'public', 'data', 'polling_stations_final.json');
    fs.writeFileSync(finalPath, JSON.stringify(pollingStations, null, 2));
    
    // 통계 파일 생성
    const statsPath = path.join(__dirname, '..', 'public', 'data', 'final_geocoding_stats.json');
    const finalStats = {
      total: pollingStations.length,
      success: successCount,
      failed: failCount,
      successRate: ((successCount / pollingStations.length) * 100).toFixed(1),
      processedAt: new Date().toISOString(),
      processingTime: `${totalTime.toFixed(1)} minutes`,
      byDistrict: {}
    };
    
    // 지역별 최종 통계
    Object.entries(districtStats).forEach(([district, stats]) => {
      finalStats.byDistrict[district] = {
        total: stats.total,
        success: stats.success,
        failed: stats.failed,
        successRate: ((stats.success / stats.total) * 100).toFixed(1) + '%'
      };
    });
    
    fs.writeFileSync(statsPath, JSON.stringify(finalStats, null, 2));
    
    console.log('\n🎉 === FINAL RESULTS ===');
    console.log(`📁 Data saved to: ${finalPath}`);
    console.log(`📊 Total processed: ${pollingStations.length}`);
    console.log(`✅ Successfully geocoded: ${successCount}`);
    console.log(`❌ Failed to geocode: ${failCount}`);
    console.log(`📈 Final success rate: ${((successCount / pollingStations.length) * 100).toFixed(1)}%`);
    console.log(`⏱️ Total processing time: ${totalTime.toFixed(1)} minutes`);
    console.log(`📋 Statistics saved to: ${statsPath}`);
    
    console.log('\n🗺️ Final District Breakdown:');
    Object.entries(finalStats.byDistrict).forEach(([district, stats]) => {
      console.log(`  ${district}: ${stats.success}/${stats.total} (${stats.successRate})`);
    });
    
    // 백업 파일 생성
    const backupPath = path.join(__dirname, '..', 'public', 'data', `polling_stations_backup_${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(pollingStations, null, 2));
    console.log(`\n💾 Backup saved to: ${backupPath}`);
    
  } catch (error) {
    console.error('❌ Critical error during processing:', error);
    
    // 오류 발생 시에도 현재까지의 데이터 저장
    if (pollingStations.length > 0) {
      const errorBackupPath = path.join(__dirname, '..', 'public', 'data', `polling_stations_error_backup_${Date.now()}.json`);
      fs.writeFileSync(errorBackupPath, JSON.stringify(pollingStations, null, 2));
      console.log(`💾 Error backup saved to: ${errorBackupPath}`);
    }
  }
}

console.log('🎯 FINAL COMPLETE PROCESSING STARTING...');
console.log('📈 Expected success rate: ~95%+ (based on test results)');
console.log('⏰ Estimated time: 1.5-2 hours for 3,568 stations');
console.log('💾 Progress will be saved every 100 stations\n');

processAllStationsComplete(); 