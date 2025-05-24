import sqlite3

conn = sqlite3.connect('instance/sales_training.db')
cursor = conn.cursor()

# Update the migration version to the correct value
cursor.execute("UPDATE alembic_version SET version_num = 'b3abebdf4435'")
conn.commit()

print('Updated migration version to b3abebdf4435')
conn.close() 