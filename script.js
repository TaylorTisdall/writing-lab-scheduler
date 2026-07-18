const SUPABASE_URL = "https://mdnyzlzaarzozbmqhecz.supabase.co";

const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kbnl6bHphYXJ6b3pibXFoZWN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNTU5NzgsImV4cCI6MjA5OTczMTk3OH0.FYJgBDOhmqg516ApoPAqWezMIaSIHseoKCcUcU6m-To";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

console.log("Supabase client created.");

async function addConsultant() {
  const nameInput = document.getElementById("consultantName");
  const name = nameInput.value.trim();

  if (!name) {
    alert("Enter a consultant name.");
    return;
  }

  console.log("Attempting to add consultant:", name);

  const { error } = await supabaseClient
    .from("consultants")
    .insert({ name: name });

  if (error) {
    console.error("Supabase insert error:", error);
    alert("Error adding consultant. Check the console.");
    return;
  }

  console.log("Consultant insert succeeded.");
  alert("Consultant added!");
  nameInput.value = "";
}
