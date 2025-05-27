import pandas as pd
import requests
import json
import time
from urllib.parse import quote

def read_excel_data(file_path):
    """Excel 파일을 읽어서 DataFrame으로 반환"""
    try:
        df = pd.read_excel(file_path)
        print(f"Excel 파일 컬럼: {df.columns.tolist()}")
        print(f"총 {len(df)}개의 투표소 데이터를 읽었습니다.")
        return df
    except Exception as e:
        print(f"Excel 파일 읽기 오류: {e}")
        return None

def get_coordinates_from_address(address):
    """주소를 이용해 좌표를 구하는 함수 (OpenStreetMap Nominatim API 사용)"""
    try:
        # OpenStreetMap Nominatim API 사용 (무료)
        encoded_address = quote(f"{address}, South Korea")
        url = f"https://nominatim.openstreetmap.org/search?q={encoded_address}&format=json&limit=1"
        
        headers = {
            'User-Agent': 'YEFF-Alert-Polling-Station-Mapper/1.0'
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data:
                lat = float(data[0]['lat'])
                lng = float(data[0]['lon'])
                return lat, lng
        
        return None, None
    except Exception as e:
        print(f"좌표 검색 오류 ({address}): {e}")
        return None, None

def process_polling_stations(file_path):
    """투표소 데이터를 처리하고 좌표를 추가하는 메인 함수"""
    # Excel 파일 읽기
    df = read_excel_data(file_path)
    if df is None:
        return
    
    print("데이터 샘플:")
    print(df.head())
    
    # 결과 저장용 리스트
    polling_stations = []
    
    # 처리된 주소 중복 방지를 위한 캐시
    address_cache = {}
    
    # 각 행을 처리 (처음 100개만 테스트)
    max_rows = min(100, len(df))  # 테스트용으로 100개만
    
    for index, row in df.head(max_rows).iterrows():
        try:
            # 실제 컬럼명 사용
            sido = str(row['시도']).strip() if pd.notna(row['시도']) else ""
            gugun = str(row['구시군명']).strip() if pd.notna(row['구시군명']) else ""
            dong_name = str(row['읍면동명']).strip() if pd.notna(row['읍면동명']) else ""
            station_name = str(row['사전투표소명']).strip() if pd.notna(row['사전투표소명']) else ""
            
            # 주소 조합
            address_parts = [sido, gugun, dong_name]
            address = " ".join([part for part in address_parts if part and part != 'nan'])
            
            if not station_name or not address:
                print(f"빈 데이터 건너뛰기: {index}")
                continue
            
            print(f"처리 중 ({index + 1}/{max_rows}): {station_name} - {address}")
            
            # 좌표 구하기 (캐시 사용)
            if address in address_cache:
                lat, lng = address_cache[address]
                print(f"캐시에서 좌표 사용: {lat}, {lng}")
            else:
                lat, lng = get_coordinates_from_address(address)
                address_cache[address] = (lat, lng)
                # API 호출 제한을 위한 대기 (1초)
                time.sleep(1)
            
            if lat and lng:
                station_data = {
                    "id": f"station_{index + 1}",
                    "name": station_name,
                    "address": address,
                    "district": sido,
                    "gugun": gugun,
                    "dong": dong_name,
                    "coordinates": {
                        "lat": lat,
                        "lng": lng
                    },
                    "isActive": False,
                    "entryCount": 0,
                    "exitCount": 0,
                    "alerts": [],
                    "youtubeUrls": {
                        "morning": "",  # 오전 유튜브 링크
                        "afternoon": "" # 오후 유튜브 링크
                    }
                }
                polling_stations.append(station_data)
                print(f"✓ 좌표 찾음: {lat}, {lng}")
            else:
                print(f"✗ 좌표 찾지 못함: {address}")
            
        except Exception as e:
            print(f"행 처리 오류 ({index}): {e}")
            continue
    
    # JSON 파일로 저장
    output_file = "polling_stations.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(polling_stations, f, ensure_ascii=False, indent=2)
    
    print(f"\n완료! {len(polling_stations)}개의 투표소 데이터가 {output_file}에 저장되었습니다.")
    
    # 지역별 통계
    district_counts = {}
    for station in polling_stations:
        district = station['district']
        district_counts[district] = district_counts.get(district, 0) + 1
    
    print("\n지역별 투표소 수:")
    for district, count in sorted(district_counts.items()):
        print(f"  {district}: {count}개")
    
    return polling_stations

if __name__ == "__main__":
    # Excel 파일 처리 실행
    result = process_polling_stations("list.xlsx")
    if result:
        print(f"\n처리 완료! 총 {len(result)}개의 투표소 데이터 생성") 