import dotenv from 'dotenv';
dotenv.config();

async function checkSchema() {
  const url = `${process.env.SUPABASE_URL}/rest/v1/?apikey=${process.env.SUPABASE_SERVICE_ROLE_KEY}`;
  
  try {
    const res = await fetch(url);
    const schema = await res.json();
    
    // Check if get_dashboard_metrics is in the paths
    const hasDashboardMetrics = Object.keys(schema.paths || {}).some(p => p.includes('get_dashboard_metrics'));
    
    console.log("Found get_dashboard_metrics in schema?", hasDashboardMetrics);
    
    if (!hasDashboardMetrics) {
      console.log("It's definitely missing from the PostgREST schema cache.");
    }
  } catch (err) {
    console.error("Error fetching schema:", err);
  }
}

checkSchema();
