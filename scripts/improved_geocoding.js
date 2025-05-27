const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// 주소 정규화 함수
function normalizeAddress(sido, sigungu, dong) {
  // 기본 주소 구성
  let baseAddress = `${sido} ${sigungu}`;
  
  // "제X동" 패턴 처리
  let normalizedDong = dong;
  if (dong.includes('제') && dong.includes('동')) {
    // "창신제1동" -> "창신동"
    normalizedDong = dong.replace(/제\d+동/, '동');
    // 이미 "동"이 있다면 중복 제거
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
  
  console.log(`🔍 Trying geocoding for: ${stationName}`);
  
  // 여러 주소 변형을 시도
  for (let i = 0; i < addressVariations.length; i++) {
    const address = addressVariations[i];
    console.log(`  Attempt ${i + 1}: ${address}`);
    
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
        
        console.log(`  ✅ Success with: ${address}`);
        return {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          display_name: result.display_name,
          matched_address: address
        };
      }
      
      await new Promise(resolve => setTimeout(resolve, 500)); // 짧은 딜레이
    } catch (error) {
      console.log(`  ❌ Error with ${address}:`, error.message);
    }
  }
  
  console.log(`  ❌ All attempts failed for: ${stationName}`);
  return null;
}

// 딜레이 함수
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function processImprovedGeocodingTest() {
  try {
    console.log('📖 Reading Excel file...');
    const workbook = XLSX.readFile('list.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`Found ${rawData.length} total polling stations`);
    console.log('Testing improved geocoding on first 50 stations...\n');
    
    // 처음 50개만 테스트
    const testData = rawData.slice(0, 50);
    const pollingStations = [];
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < testData.length; i++) {
      const row = testData[i];
      
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
      
      console.log(`\n🔍 Processing ${i + 1}/50: ${station.name}`);
      
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
        successCount++;
        console.log(`✅ Final Success: ${station.name} - ${geocodeResult.lat}, ${geocodeResult.lng}`);
      } else {
        station.coordinates = {
          lat: 37.5665,
          lng: 126.9780
        };
        station.geocoded_address = null;
        failCount++;
        console.log(`❌ Final Failed: ${station.name}`);
      }
      
      pollingStations.push(station);
      
      // API 요청 제한을 위한 딜레이
      await delay(2000);
      
      // 10개마다 진행 상황 출력
      if ((i + 1) % 10 === 0) {
        console.log(`\n📊 Progress: ${i + 1}/50 completed`);
        console.log(`Success: ${successCount}, Failed: ${failCount}`);
        console.log(`Success rate: ${((successCount / (i + 1)) * 100).toFixed(1)}%\n`);
      }
    }
    
    // 결과 저장
    const outputPath = path.join(__dirname, '..', 'public', 'data', 'polling_stations_improved.json');
    fs.writeFileSync(outputPath, JSON.stringify(pollingStations, null, 2));
    
    console.log('\n🎉 Improved Geocoding Test Complete!');
    console.log(`📁 Data saved to: ${outputPath}`);
    console.log(`📊 Results: ${successCount} success, ${failCount} failed`);
    console.log(`📈 Success rate: ${((successCount / 50) * 100).toFixed(1)}%`);
    
    // 실패한 케이스 분석
    const failedStations = pollingStations.filter(s => !s.geocoded_address);
    if (failedStations.length > 0) {
      console.log('\n❌ Failed Cases Analysis:');
      failedStations.forEach(station => {
        console.log(`  - ${station.name}: ${station.address}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error in improved geocoding:', error);
  }
}

console.log('🚀 Starting improved geocoding test...');
console.log('📍 Testing address normalization techniques...\n');

processImprovedGeocodingTest(); 