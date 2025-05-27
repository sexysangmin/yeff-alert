const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Nominatim API를 사용한 Geocoding 함수
async function geocodeAddress(address) {
  try {
    // URL 인코딩
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

// 딜레이 함수 (API 요청 제한 준수)
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function processAllPollingStations() {
  try {
    // Excel 파일 읽기
    console.log('Reading Excel file...');
    const workbook = XLSX.readFile('list.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`Found ${rawData.length} polling stations in Excel file`);
    
    // 데이터 변환 및 구조화
    const pollingStations = [];
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      
      // 기본 투표소 정보 생성
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
      
      // Geocoding 시도
      console.log(`Processing ${i + 1}/${rawData.length}: ${station.name}`);
      
      const geocodeResult = await geocodeAddress(station.address);
      
      if (geocodeResult) {
        station.coordinates = {
          lat: geocodeResult.lat,
          lng: geocodeResult.lng
        };
        station.geocoded_address = geocodeResult.display_name;
        successCount++;
        console.log(`✓ Success: ${station.name} - ${geocodeResult.lat}, ${geocodeResult.lng}`);
      } else {
        // 좌표를 얻지 못한 경우 기본값 설정 (서울 중심)
        station.coordinates = {
          lat: 37.5665,
          lng: 126.9780
        };
        station.geocoded_address = null;
        failCount++;
        console.log(`✗ Failed: ${station.name}`);
      }
      
      pollingStations.push(station);
      
      // API 요청 제한을 위한 딜레이 (1초)
      await delay(1000);
      
      // 진행 상황 저장 (100개마다)
      if ((i + 1) % 100 === 0) {
        console.log(`\n=== Progress Update ===`);
        console.log(`Processed: ${i + 1}/${rawData.length}`);
        console.log(`Success: ${successCount}, Failed: ${failCount}`);
        console.log(`Success rate: ${((successCount / (i + 1)) * 100).toFixed(1)}%`);
        
        // 중간 저장
        const outputPath = path.join(__dirname, '..', 'public', 'data', `polling_stations_partial_${i + 1}.json`);
        fs.writeFileSync(outputPath, JSON.stringify(pollingStations, null, 2));
        console.log(`Partial data saved to: ${outputPath}\n`);
      }
    }
    
    // 최종 결과 저장
    const outputPath = path.join(__dirname, '..', 'public', 'data', 'polling_stations_complete.json');
    fs.writeFileSync(outputPath, JSON.stringify(pollingStations, null, 2));
    
    console.log('\n=== Final Results ===');
    console.log(`Total processed: ${pollingStations.length}`);
    console.log(`Successfully geocoded: ${successCount}`);
    console.log(`Failed to geocode: ${failCount}`);
    console.log(`Success rate: ${((successCount / pollingStations.length) * 100).toFixed(1)}%`);
    console.log(`Data saved to: ${outputPath}`);
    
    // 통계 파일 생성
    const statsPath = path.join(__dirname, '..', 'public', 'data', 'geocoding_stats.json');
    const stats = {
      total: pollingStations.length,
      success: successCount,
      failed: failCount,
      successRate: ((successCount / pollingStations.length) * 100).toFixed(1),
      processedAt: new Date().toISOString(),
      byDistrict: {}
    };
    
    // 지역별 통계
    pollingStations.forEach(station => {
      if (!stats.byDistrict[station.district]) {
        stats.byDistrict[station.district] = { total: 0, success: 0 };
      }
      stats.byDistrict[station.district].total++;
      if (station.geocoded_address) {
        stats.byDistrict[station.district].success++;
      }
    });
    
    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
    console.log(`Statistics saved to: ${statsPath}`);
    
  } catch (error) {
    console.error('Error processing polling stations:', error);
  }
}

// 스크립트 실행
console.log('🚀 Starting complete polling station processing...');
console.log('This may take a while (approximately 1 hour for 3,568 stations)...\n');

processAllPollingStations(); 