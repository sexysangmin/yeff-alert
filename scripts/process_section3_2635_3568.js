const XLSX = require('xlsx');
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
          'User-Agent': 'YEFF-Alert-Section3-Monitor/1.0'
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

async function processSection3() {
  try {
    console.log('🔄 Section 3: Processing stations 2635-3568');
    console.log('📖 Reading Excel file...');
    
    const workbook = XLSX.readFile('list.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet);
    
    // 2635-3568 범위 추출 (인덱스 2634-3567)
    const sectionData = rawData.slice(2634, 3568);
    console.log(`📊 Section 3 data: ${sectionData.length} stations (2635-3568)`);
    
    const pollingStations = [];
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < sectionData.length; i++) {
      const row = sectionData[i];
      const stationNumber = 2635 + i;
      
      const station = {
        id: `station_${stationNumber}`,
        name: row['사전투표소명'] || row['투표소명'] || `투표소_${stationNumber}`,
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
      
      console.log(`🔍 [${i + 1}/${sectionData.length}] Processing #${stationNumber}: ${station.name}`);
      console.log(`    Address: ${station.address}`);
      
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
        station.processed_section = 'section3';
        successCount++;
        console.log(`  ✅ SUCCESS: ${geocodeResult.lat}, ${geocodeResult.lng} (attempt ${geocodeResult.attempt})`);
      } else {
        station.coordinates = {
          lat: 37.5665,
          lng: 126.9780
        };
        station.geocoded_address = null;
        failCount++;
        console.log(`  ❌ Failed`);
      }
      
      pollingStations.push(station);
      
      // API 요청 제한을 위한 딜레이
      await delay(1500);
      
      // 50개마다 진행 상황 출력
      if ((i + 1) % 50 === 0) {
        console.log(`\n📊 Section 3 Progress: ${i + 1}/${sectionData.length}`);
        console.log(`Success: ${successCount}, Failed: ${failCount}`);
        console.log(`Success rate: ${((successCount / (i + 1)) * 100).toFixed(1)}%\n`);
        
        // 중간 저장
        const partialPath = path.join(__dirname, '..', 'public', 'data', `section3_partial_${i + 1}.json`);
        fs.writeFileSync(partialPath, JSON.stringify(pollingStations, null, 2));
        console.log(`Partial saved: ${partialPath}\n`);
      }
    }
    
    // 최종 결과 저장
    const outputPath = path.join(__dirname, '..', 'public', 'data', 'section3_complete_2635_3568.json');
    fs.writeFileSync(outputPath, JSON.stringify(pollingStations, null, 2));
    
    console.log('\n🎉 === SECTION 3 COMPLETE ===');
    console.log(`📁 Data saved to: ${outputPath}`);
    console.log(`📊 Total processed: ${pollingStations.length}`);
    console.log(`✅ Successfully geocoded: ${successCount}`);
    console.log(`❌ Failed to geocode: ${failCount}`);
    console.log(`📈 Success rate: ${((successCount / pollingStations.length) * 100).toFixed(1)}%`);
    
    // 백업 파일 생성
    const backupPath = path.join(__dirname, '..', 'public', 'data', `section3_backup_${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(pollingStations, null, 2));
    console.log(`💾 Backup saved: ${backupPath}`);
    
  } catch (error) {
    console.error('❌ Error in section 3 processing:', error);
  }
}

console.log('🚀 Starting Section 3 processing (2635-3568)...');
console.log('📈 Using improved geocoding with address normalization');
console.log('⏱️ Estimated time: 20-25 minutes\n');

processSection3(); 