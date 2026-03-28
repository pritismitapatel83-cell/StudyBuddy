$aliceToken = "test1"
$bobToken = "test2"
$bobId = 8

# Alice sends connection request to Bob
Write-Host "Alice sending connection request to Bob..." -ForegroundColor Cyan
$reqResp = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/api/connections/request' -Method POST -ContentType 'application/json' -Headers @{
  'Authorization' = "Bearer $aliceToken"
} -Body (@{
  receiver_id = $bobId
  subject = 'DBMS'
} | ConvertTo-Json) -UseBasicParsing

$reqData = $reqResp.Content | ConvertFrom-Json
Write-Host "Request sent: " $reqData.success -ForegroundColor Green
Write-Host "Message: " $reqData.message
