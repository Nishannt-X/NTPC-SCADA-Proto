const res = await fetch("http://localhost:8080/api/v1/auth/login", {
  method: "POST", headers: {"Content-Type": "application/json"},
  body: JSON.stringify({username: "supervisor", password: "supervisor123"})
});
const { accessToken } = await res.json();
const maintRes = await fetch("http://localhost:8080/api/v1/shift-handovers", {
  headers: { "Authorization": "Bearer " + accessToken }
});
console.log(await maintRes.text());
