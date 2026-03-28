# Test login for each student
$students = @(
  @{email='bob@email.com'; password='pass123'; name='Bob'},
  @{email='khushikumari@gmail.com'; password='khushi'; name='Khushi'},
  @{email='payalpatel@gmail.com'; password='payal'; name='Payal'}
)

Write-Host "=== Testing Student Logins ===" -ForegroundColor Cyan
Write-Host ""

foreach ($s in $students) {
  try {
    $response = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/api/auth/login' -Method POST -ContentType 'application/json' -Body (@{
      email = $s.email
      password = $s.password
    } | ConvertTo-Json) -UseBasicParsing -ErrorAction Stop
    
    $result = $response.Content | ConvertFrom-Json
    if ($result.success) {
      Write-Host "[OK] $($s.name) - LOGIN SUCCESS" -ForegroundColor Green
    } else {
      Write-Host "[FAIL] $($s.name) - LOGIN FAILED: $($result.error)" -ForegroundColor Red
    }
  } catch {
    Write-Host "[ERROR] $($s.name) - $($_.Exception.Message)" -ForegroundColor Red
  }
}
