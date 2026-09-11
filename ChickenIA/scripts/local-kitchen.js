// Isolated PGlite fixture for the real kitchen-plan API in the local dev server.
module.exports = function localKitchen(db) {
  const sql=async(parts,...values)=>(await db.query(parts.reduce((s,p,i)=>s+(i?'$'+i:'')+p,''),values)).rows;
  let ready;
  return async () => {
    if(!ready)ready=(async()=>{
      await db.exec(`CREATE TABLE IF NOT EXISTS areas(id int primary key,code text);
        INSERT INTO areas VALUES(1,'cocina') ON CONFLICT DO NOTHING;
        CREATE TABLE IF NOT EXISTS activities(id serial primary key,area_id int,name text,frequency text,unit text,active boolean,requires_quantity boolean,valid_from date,valid_until date,order_index int);
        CREATE TABLE IF NOT EXISTS kitchen_plans(activity_id int,plan_date date,kg numeric,scheduled_by text,updated_at timestamptz default now(),PRIMARY KEY(activity_id,plan_date));
        CREATE TABLE IF NOT EXISTS activity_checks(activity_id int,check_date date);`);
      if(!(await sql`SELECT count(*)::int n FROM activities`)[0].n){
        let index=0;
        for(const [name,,requires_quantity,unit,,,,frequency] of require('../lib/supervision/cocina-routines')){
          await sql`INSERT INTO activities(area_id,name,frequency,unit,active,requires_quantity,order_index) VALUES(1,${name},${frequency},${unit},true,${requires_quantity},${++index})`;
        }
      }
    })().catch(e=>{ready=null;throw e;});
    await ready;return sql;
  };
};
