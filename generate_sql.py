import re

with open('sensor-simulator/src/main/java/com/ntpc/simulator/config/SensorFleetConfig.java', 'r') as f:
    lines = f.readlines()

sql = []
sql.append("-- Auto-generated from SensorFleetConfig.java\n")
sql.append("DELETE FROM threshold_definitions;\n")
sql.append("DELETE FROM sensor_definitions;\n\n")

for line in lines:
    m = re.search(r'addSensor\(fleet, unit, prefix \+ "-(.*?)", "(.*?)", ([\d\.\-]+), ".*?", ([\d\.\-]+), ([\d\.\-]+), ([\d\.\-]+), ([\d\.\-]+), "(.*?)"\);', line)
    if m:
        sensor_suffix = m.group(1)
        sensor_type = m.group(2)
        warn = m.group(6)
        crit = m.group(7)
        segment = m.group(8)
        
        for unit, prefix in [("UNIT_1", "U1"), ("UNIT_2", "U2")]:
            sensor_id = f"{prefix}-{sensor_suffix}"
            sql.append(f"INSERT INTO sensor_definitions (sensor_id, unit, sensor_type, location_category, location_section, location_name) VALUES ('{sensor_id}', '{unit}', '{sensor_type}', '{segment}', 'Main', '{sensor_suffix.replace('_', ' ')}') ON CONFLICT (sensor_id) DO NOTHING;")
            sql.append(f"INSERT INTO threshold_definitions (sensor_id, warning_threshold, critical_threshold, created_by) VALUES ('{sensor_id}', {warn}, {crit}, 'system');\n")

with open('query-api/src/main/resources/db/migration/V9__Seed_Sensors.sql', 'w') as f:
    f.writelines(sql)

print("Generated V9__Seed_Sensors.sql successfully!")
