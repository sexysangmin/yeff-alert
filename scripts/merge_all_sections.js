const fs = require('fs');
const path = require('path');

async function mergeAllSections() {
  try {
    console.log('🔧 Starting final merge of all sections...');
    
    const dataDir = path.join(__dirname, '..', 'public', 'data');
    const mergedData = [];
    
    // 1. 구간 1: 1-900 재처리된 데이터
    console.log('📁 Loading Section 1 (1-900 reprocessed)...');
    const section1Path = path.join(dataDir, 'polling_stations_reprocessed_900.json');
    const section1Data = JSON.parse(fs.readFileSync(section1Path, 'utf8'));
    mergedData.push(...section1Data);
    console.log(`✅ Section 1: ${section1Data.length} stations added`);
    
    // 2. 구간 1.5: 901-1700 재처리된 데이터
    console.log('📁 Loading Section 1.5 (901-1700 reprocessed)...');
    const section1_5Path = path.join(dataDir, 'polling_stations_reprocessed_1700.json');
    if (fs.existsSync(section1_5Path)) {
      const section1_5Data = JSON.parse(fs.readFileSync(section1_5Path, 'utf8'));
      // 901-1700 범위만 추출 (인덱스 900-1699)
      const range901to1700 = section1_5Data.slice(900, 1700);
      mergedData.push(...range901to1700);
      console.log(`✅ Section 1.5: ${range901to1700.length} stations added`);
    } else {
      console.log('⚠️ Section 1.5 file not found, using original 901-1700 data');
      // 원본 1700 데이터에서 901-1700 추출
      const originalPath = path.join(dataDir, 'polling_stations_partial_1700.json');
      const originalData = JSON.parse(fs.readFileSync(originalPath, 'utf8'));
      const range901to1700 = originalData.slice(900, 1700);
      mergedData.push(...range901to1700);
      console.log(`✅ Section 1.5 (original): ${range901to1700.length} stations added`);
    }
    
    // 3. 구간 2: 1701-2634 신규 처리된 데이터
    console.log('📁 Loading Section 2 (1701-2634)...');
    const section2Path = path.join(dataDir, 'section2_complete_1701_2634.json');
    if (fs.existsSync(section2Path)) {
      const section2Data = JSON.parse(fs.readFileSync(section2Path, 'utf8'));
      mergedData.push(...section2Data);
      console.log(`✅ Section 2: ${section2Data.length} stations added`);
    } else {
      console.log('❌ Section 2 file not found! Please run section 2 processing first.');
      return;
    }
    
    // 4. 구간 3: 2635-3568 신규 처리된 데이터
    console.log('📁 Loading Section 3 (2635-3568)...');
    const section3Path = path.join(dataDir, 'section3_complete_2635_3568.json');
    if (fs.existsSync(section3Path)) {
      const section3Data = JSON.parse(fs.readFileSync(section3Path, 'utf8'));
      mergedData.push(...section3Data);
      console.log(`✅ Section 3: ${section3Data.length} stations added`);
    } else {
      console.log('❌ Section 3 file not found! Please run section 3 processing first.');
      return;
    }
    
    // 5. 최종 통계 계산
    const totalStations = mergedData.length;
    const totalSuccessful = mergedData.filter(s => s.geocoded_address).length;
    const totalFailed = totalStations - totalSuccessful;
    const finalSuccessRate = ((totalSuccessful / totalStations) * 100).toFixed(1);
    
    console.log('\n📊 === MERGE STATISTICS ===');
    console.log(`Total stations: ${totalStations}`);
    console.log(`Successfully geocoded: ${totalSuccessful}`);
    console.log(`Failed to geocode: ${totalFailed}`);
    console.log(`Final success rate: ${finalSuccessRate}%`);
    
    // 6. 구간별 통계
    console.log('\n📊 Success rates by section:');
    const section1Success = mergedData.slice(0, 900).filter(s => s.geocoded_address).length;
    const section1_5Success = mergedData.slice(900, 1700).filter(s => s.geocoded_address).length;
    const section2Success = mergedData.slice(1700, 2634).filter(s => s.geocoded_address).length;
    const section3Success = mergedData.slice(2634).filter(s => s.geocoded_address).length;
    
    console.log(`  Section 1 (1-900): ${section1Success}/900 (${((section1Success/900)*100).toFixed(1)}%)`);
    console.log(`  Section 1.5 (901-1700): ${section1_5Success}/800 (${((section1_5Success/800)*100).toFixed(1)}%)`);
    console.log(`  Section 2 (1701-2634): ${section2Success}/934 (${((section2Success/934)*100).toFixed(1)}%)`);
    console.log(`  Section 3 (2635-3568): ${section3Success}/934 (${((section3Success/934)*100).toFixed(1)}%)`);
    
    // 7. 지역별 통계
    const districtStats = {};
    mergedData.forEach(station => {
      const district = station.district || '알 수 없음';
      if (!districtStats[district]) {
        districtStats[district] = { total: 0, success: 0 };
      }
      districtStats[district].total++;
      if (station.geocoded_address) {
        districtStats[district].success++;
      }
    });
    
    console.log('\n🗺️ Success rates by district:');
    Object.entries(districtStats).forEach(([district, stats]) => {
      const rate = ((stats.success / stats.total) * 100).toFixed(1);
      console.log(`  ${district}: ${stats.success}/${stats.total} (${rate}%)`);
    });
    
    // 8. 최종 파일 저장
    const finalPath = path.join(dataDir, 'polling_stations_final_complete.json');
    fs.writeFileSync(finalPath, JSON.stringify(mergedData, null, 2));
    console.log(`\n📁 Final merged data saved to: ${finalPath}`);
    
    // 9. 통계 파일 저장
    const statsPath = path.join(dataDir, 'final_complete_stats.json');
    const finalStats = {
      total: totalStations,
      successful: totalSuccessful,
      failed: totalFailed,
      successRate: finalSuccessRate + '%',
      processedAt: new Date().toISOString(),
      bySection: {
        'section1_1_900': {
          total: 900,
          success: section1Success,
          successRate: ((section1Success/900)*100).toFixed(1) + '%'
        },
        'section1_5_901_1700': {
          total: 800,
          success: section1_5Success,
          successRate: ((section1_5Success/800)*100).toFixed(1) + '%'
        },
        'section2_1701_2634': {
          total: 934,
          success: section2Success,
          successRate: ((section2Success/934)*100).toFixed(1) + '%'
        },
        'section3_2635_3568': {
          total: 934,
          success: section3Success,
          successRate: ((section3Success/934)*100).toFixed(1) + '%'
        }
      },
      byDistrict: districtStats
    };
    
    fs.writeFileSync(statsPath, JSON.stringify(finalStats, null, 2));
    console.log(`📊 Final statistics saved to: ${statsPath}`);
    
    // 10. 백업 생성
    const backupPath = path.join(dataDir, `final_complete_backup_${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(mergedData, null, 2));
    console.log(`💾 Backup saved to: ${backupPath}`);
    
    console.log('\n🎉 === FINAL MERGE COMPLETE ===');
    console.log(`🎯 Total success rate: ${finalSuccessRate}%`);
    console.log(`📈 Ready for production use!`);
    
  } catch (error) {
    console.error('❌ Error during merge:', error);
  }
}

console.log('🔧 Starting final section merge...');
console.log('📊 This will combine all processed sections into one complete dataset\n');

mergeAllSections(); 