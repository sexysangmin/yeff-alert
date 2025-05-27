import pandas as pd

try:
    # Excel 파일 읽기
    df = pd.read_excel("list.xlsx")
    
    print("=== Excel 파일 분석 ===")
    print(f"전체 행 수: {len(df)}")
    print(f"전체 열 수: {len(df.columns)}")
    print("\n컬럼 이름들:")
    for i, col in enumerate(df.columns):
        print(f"  {i}: {col}")
    
    print("\n첫 5행 데이터:")
    print(df.head())
    
    print("\n데이터 타입:")
    print(df.dtypes)
    
except Exception as e:
    print(f"오류 발생: {e}") 