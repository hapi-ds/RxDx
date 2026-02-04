import asyncio
import asyncpg
import sys
sys.path.insert(0, '/workspace/backend')
from app.core.config import settings

async def check_risks():
    conn = await asyncpg.connect(
        host=settings.POSTGRES_SERVER,
        port=settings.POSTGRES_PORT,
        user=settings.POSTGRES_USER,
        password=settings.POSTGRES_PASSWORD,
        database=settings.POSTGRES_DB
    )
    
    # Check what's in the graph
    query = """
    SELECT * FROM ag_catalog.cypher('rxdx_graph', $$
        MATCH (w)
        WHERE w.type IN ['requirement', 'task', 'test', 'risk']
        RETURN w.type as type, w.title as title, labels(w) as labels
        ORDER BY w.type
    $$) as (type agtype, title agtype, labels agtype);
    """
    
    results = await conn.fetch(query)
    
    print('Workitems in database:')
    print('-' * 80)
    for row in results:
        print(f'Type: {row["type"]}, Title: {row["title"]}, Labels: {row["labels"]}')
    
    await conn.close()

asyncio.run(check_risks())
