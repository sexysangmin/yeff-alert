#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import os

def merge_complete_sections():
    """완전 처리된 section2와 section3 데이터를 하나로 합치기"""
    
    # 데이터 로드
    section2_path = "public/data/section2_complete_1701_2634.json"
    section3_path = "public/data/section3_complete_2635_3568.json"
    
    print("📊 완전 처리된 투표소 데이터 통합 시작...")
    
    # Section 2 로드
    with open(section2_path, 'r', encoding='utf-8') as f:
        section2_data = json.load(f)
    print(f"✅ Section 2 로드: {len(section2_data)}개 투표소")
    
    # Section 3 로드
    with open(section3_path, 'r', encoding='utf-8') as f:
        section3_data = json.load(f)
    print(f"✅ Section 3 로드: {len(section3_data)}개 투표소")
    
    # 전체 투표소 데이터 (기존 1-1700 + section2 + section3)
    print("\n📍 기존 1-1700 데이터 로드...")
    try:
        with open("public/data/polling_stations_partial_1700.json", 'r', encoding='utf-8') as f:
            existing_data = json.load(f)
        print(f"✅ 기존 데이터: {len(existing_data)}개 투표소")
    except:
        print("❌ 기존 1700 데이터를 찾을 수 없어 1800 데이터 사용")
        with open("public/data/polling_stations_partial_1800.json", 'r', encoding='utf-8') as f:
            existing_data = json.load(f)
        print(f"✅ 기존 데이터: {len(existing_data)}개 투표소")
    
    # 데이터 통합
    print("\n🔄 데이터 통합 중...")
    
    # 기존 데이터에서 1700 이후 제거 (중복 방지)
    filtered_existing = [station for station in existing_data 
                        if int(station['id'].replace('station_', '')) <= 1700]
    print(f"✅ 필터링된 기존 데이터: {len(filtered_existing)}개")
    
    # 모든 데이터 합치기
    complete_data = filtered_existing + section2_data + section3_data
    print(f"🎉 통합 완료: {len(complete_data)}개 투표소")
    
    # 데이터 검증
    print("\n🔍 데이터 검증...")
    ids = [station['id'] for station in complete_data]
    unique_ids = set(ids)
    
    if len(ids) != len(unique_ids):
        print(f"⚠️  중복 ID 발견: {len(ids) - len(unique_ids)}개")
        duplicates = [id for id in ids if ids.count(id) > 1]
        print(f"중복 ID: {set(duplicates)}")
    else:
        print("✅ 중복 ID 없음")
    
    # 좌표 통계
    with_coords = sum(1 for station in complete_data if station.get('coordinates'))
    print(f"✅ 좌표 보유: {with_coords}/{len(complete_data)} ({with_coords/len(complete_data)*100:.1f}%)")
    
    # 지역별 통계
    districts = {}
    for station in complete_data:
        district = station.get('district', '미분류')
        districts[district] = districts.get(district, 0) + 1
    
    print(f"\n📍 지역별 분포:")
    for district, count in sorted(districts.items()):
        print(f"  {district}: {count}개")
    
    # 최종 파일 저장
    output_path = "public/data/polling_stations_complete_all.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(complete_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n💾 저장 완료: {output_path}")
    print(f"📁 파일 크기: {os.path.getsize(output_path) / 1024 / 1024:.1f}MB")
    
    return len(complete_data)

if __name__ == "__main__":
    total = merge_complete_sections()
    print(f"\n🎊 전체 투표소 데이터 통합 완료: {total}개") 