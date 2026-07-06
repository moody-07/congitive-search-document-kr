async function test() {
  const req = await fetch("http://localhost:3000/api/documents");
  const data = await req.json();
  const docs = data.documents;
  if (!docs || docs.length === 0) {
    console.log("No docs");
    return;
  }
  const blobName = docs[0].blobName;
  console.log("Testing redo on:", blobName);

  const res = await fetch("http://localhost:3000/api/documents/ocr/redo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blobName })
  });

  const text = await res.text();
  console.log("Response:", res.status, text);
}

test();
