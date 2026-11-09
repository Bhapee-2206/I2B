import openpyxl, json

wb = openpyxl.load_workbook('I2B.xlsx', data_only=True)
ws = wb['Sheet1']

# 1. Subject (Col 1-4, rows 4 to 30)
subject_students = []
for r in range(4, 31):
    sno = ws.cell(r, 1).value
    name = ws.cell(r, 2).value
    cls = ws.cell(r, 3).value
    fee = ws.cell(r, 4).value
    if name is not None:
        subject_students.append({
            'sno': int(sno) if sno else None,
            'name': str(name).strip(),
            'class': str(cls).strip() if cls else '',
            'fee': float(fee) if fee else 0.0
        })

# 2. Regular Hindi (Col 6-9, rows 4 to 27)
hindi_students = []
for r in range(4, 28):
    sno = ws.cell(r, 6).value
    name = ws.cell(r, 7).value
    grade = ws.cell(r, 8).value
    fee = ws.cell(r, 9).value
    if name is not None:
        hindi_students.append({
            'sno': int(sno) if sno else None,
            'name': str(name).strip(),
            'grade': str(grade).strip() if grade else '',
            'fee': float(fee) if fee else 0.0
        })

# 3. Weekend Hindi (Col 1-4, rows 35 to 54)
wk_hindi_students = []
for r in range(35, 55):
    sno = ws.cell(r, 1).value
    name = ws.cell(r, 2).value
    grade = ws.cell(r, 3).value
    fee = ws.cell(r, 4).value
    if name is not None:
        wk_hindi_students.append({
            'sno': int(sno) if sno else None,
            'name': str(name).strip(),
            'grade': str(grade).strip() if grade else '',
            'fee': float(fee) if fee else 0.0
        })

# 4. Online Hindi (Col 6-9, rows 35 to 38)
online_hindi_students = []
for r in range(35, 39):
    sno = ws.cell(r, 6).value
    name = ws.cell(r, 7).value
    grade = ws.cell(r, 8).value
    fee = ws.cell(r, 9).value
    if name is not None:
        online_hindi_students.append({
            'sno': int(sno) if sno else None,
            'name': str(name).strip(),
            'grade': str(grade).strip() if grade else '',
            'fee': float(fee) if fee else 0.0
        })

print("Subject count:", len(subject_students), "Total fee:", sum(s['fee'] for s in subject_students))
print("Regular Hindi count:", len(hindi_students), "Total fee:", sum(s['fee'] for s in hindi_students))
print("Weekend Hindi count:", len(wk_hindi_students), "Total fee:", sum(s['fee'] for s in wk_hindi_students))
print("Online Hindi count:", len(online_hindi_students), "Total fee:", sum(s['fee'] for s in online_hindi_students))

total_rec = len(subject_students) + len(hindi_students) + len(wk_hindi_students) + len(online_hindi_students)
total_fee = (sum(s['fee'] for s in subject_students) + 
             sum(s['fee'] for s in hindi_students) + 
             sum(s['fee'] for s in wk_hindi_students) + 
             sum(s['fee'] for s in online_hindi_students))
print("TOTAL ENROLMENT RECORDS:", total_rec, "TOTAL LISTED FEES: Rs.", total_fee)

# Check standard fees
matric_cbse = []
for r in range(4, 18):
    cls = ws.cell(r, 11).value
    m = ws.cell(r, 12).value
    c = ws.cell(r, 13).value
    matric_cbse.append({'class': str(cls).strip(), 'matric': m, 'cbse': c})

virtual_online = []
for r in range(22, 32):
    g = ws.cell(r, 11).value
    v = ws.cell(r, 12).value
    o = ws.cell(r, 13).value
    virtual_online.append({'grade': str(g).strip(), 'virtual': v, 'online': o})

data_dump = {
    'subject': subject_students,
    'hindi': hindi_students,
    'weekend_hindi': wk_hindi_students,
    'online_hindi': online_hindi_students,
    'fee_structure_matric_cbse': matric_cbse,
    'fee_structure_virtual_online': virtual_online
}

with open('excel_extracted_data.json', 'w') as f:
    json.dump(data_dump, f, indent=2)

print("Saved to excel_extracted_data.json successfully!")
