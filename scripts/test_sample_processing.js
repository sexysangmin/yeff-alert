const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Nominatim API를 사용한 Geocoding 함수
async function geocodeAddress(address) {
  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&addressdetails=1&limit=1&countrycodes=kr`;
    
    console.log(`Geocoding: ${address}`);
    
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
      const result = data[0];
      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        display_name: result.display_name
      };
    } else {
      console.log(`No results found for: ${address}`);
      return null;
    }
  } catch (error) {
    console.error(`Error geocoding ${address}:`, error);
    return null;
  }
}

// 딜레이 함수
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testSampleProcessing() {
  try {
    console.log('📖 Reading Excel file...');
    const workbook = XLSX.readFile('list.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`Found ${rawData.length} total polling stations`);
    console.log('Processing first 100 stations for testing...\n');
    
    // 처음 100개만 처리
    const sampleData = rawData.slice(0, 100);
    const pollingStations = [];
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < sampleData.length; i++) {
      const row = sampleData[i];
      
      const station = {
        id: `station_${i + 1}`,
        name: row['사전투표소명'] || row['투표소명'] || `투표소_${i + 1}`,
        address: `${row['시도']} ${row['구시군명']} ${row['읍면동명']}`.trim(),
        district: row['시도'] || '알 수 없음',
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
      
      console.log(`🔍 Processing ${i + 1}/100: ${station.name}`);
      
      const geocodeResult = await geocodeAddress(station.address);
      
      if (geocodeResult) {
        station.coordinates = {
          lat: geocodeResult.lat,
          lng: geocodeResult.lng
        };
        station.geocoded_address = geocodeResult.display_name;
        successCount++;
        console.log(`✅ Success: ${station.name} - ${geocodeResult.lat}, ${geocodeResult.lng}`);
      } else {
        station.coordinates = {
          lat: 37.5665,
          lng: 126.9780
        };
        station.geocoded_address = null;
        failCount++;
        console.log(`❌ Failed: ${station.name}`);
      }
      
      pollingStations.push(station);
      
      // API 요청 제한을 위한 딜레이 (1초)
      await delay(1000);
      
      // 20개마다 진행 상황 출력
      if ((i + 1) % 20 === 0) {
        console.log(`\n📊 Progress: ${i + 1}/100 completed`);
        console.log(`Success: ${successCount}, Failed: ${failCount}`);
        console.log(`Success rate: ${((successCount / (i + 1)) * 100).toFixed(1)}%\n`);
      }
    }
    
    // 결과 저장
    const outputPath = path.join(__dirname, '..', 'public', 'data', 'polling_stations_sample.json');
    fs.writeFileSync(outputPath, JSON.stringify(pollingStations, null, 2));
    
    console.log('\n🎉 Sample Processing Complete!');
    console.log(`📁 Data saved to: ${outputPath}`);
    console.log(`📊 Results: ${successCount} success, ${failCount} failed`);
    console.log(`📈 Success rate: ${((successCount / 100) * 100).toFixed(1)}%`);
    
    // 지역별 분포 확인
    const districtCount = {};
    pollingStations.forEach(station => {
      districtCount[station.district] = (districtCount[station.district] || 0) + 1;
    });
    
    console.log('\n🗺️ Distribution by District:');
    Object.entries(districtCount).forEach(([district, count]) => {
      console.log(`  ${district}: ${count} stations`);
    });
    
  } catch (error) {
    console.error('❌ Error processing sample:', error);
  }
}

console.log('🚀 Starting sample processing (first 100 stations)...');
console.log('⏱️ This should take about 2-3 minutes...\n');

testSampleProcessing(); 