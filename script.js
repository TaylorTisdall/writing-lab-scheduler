const SUPABASE_URL = "https://mdnyzlzaarzozbmqhecz.supabase.co/rest/v1/";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kbnl6bHphYXJ6b3pibXFoZWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNTU5NzgsImV4cCI6MjA5OTczMTk3OH0.FYJgBDOhmqg516ApoPAqWezMIaSIHseoKCcUcU6m-To";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

console.log("Supabase connected!");
async function addConsultant() {
  const name = document.getElementById("consultantName").value;

  const { data, error } = await supabaseClient
    .from("consultants")
    .insert([
      { name: name }
    ]);

  if (error) {
    console.log(error);
    alert("Error adding consultant");
  } else {
    console.log(data);
    alert("Consultant added!");
  }
}
