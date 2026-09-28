async function testLogin() {
  console.log("Testing POST /api/app/auth/login with djzubby / 143143...");
  const res = await fetch("http://localhost:3000/api/app/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "djzubby", password: "143143" }),
  });

  const data = await res.json();
  console.log("Status:", res.status);
  console.log("Response:", JSON.stringify(data, null, 2));

  if (data.success && data.user?.username === "djzubby" && (data.user?.role === "admin" || data.user?.role === "super_admin")) {
    console.log("✅ SUCCESS: djzubby successfully authenticated as admin!");
  } else {
    console.error("❌ FAILED: Login failed or user is not admin.");
    process.exit(1);
  }
}

testLogin().catch(console.error);
