const fs = require('fs');
const path = require('path');

try {
  const dataPath = path.join(__dirname, '..', 'public', 'data', 'polling_stations_partial_900.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  
  const total = data.length;
  const success = data.filter(s => s.geocoded_address).length;
  const failed = total - success;
  
  const report = [];
  report.push('📊 Current Progress (900 stations):');
  report.push(`✅ Success: ${success}/${total}`);
  report.push(`📈 Success rate: ${(success/total*100).toFixed(1)}%`);
  report.push(`❌ Failed: ${failed}`);
  
  // 지역별 통계
  const byDistrict = {};
  data.forEach(station => {
    const district = station.district || '알 수 없음';
    if (!byDistrict[district]) {
      byDistrict[district] = { total: 0, success: 0 };
    }
    byDistrict[district].total++;
    if (station.geocoded_address) {
      byDistrict[district].success++;
    }
  });
  
  report.push('\n🗺️ By District:');
  Object.entries(byDistrict).forEach(([district, stats]) => {
    const rate = ((stats.success / stats.total) * 100).toFixed(1);
    report.push(`  ${district}: ${stats.success}/${stats.total} (${rate}%)`);
  });
  
  // 콘솔 출력
  report.forEach(line => console.log(line));
  
  // 파일 저장
  const reportPath = path.join(__dirname, '..', 'progress_report.txt');
  fs.writeFileSync(reportPath, report.join('\n'), 'utf8');
  console.log(`\n📁 Report saved to: progress_report.txt`);
  
} catch (error) {
  console.error('Error:', error.message);
} 