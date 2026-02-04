param(
  [Parameter(Mandatory = $true)]
  [string]$BaseUrl,
  [Parameter(Mandatory = $true)]
  [string]$Secret
)

$uri = "$BaseUrl/api/cron/check-tos"

$response = Invoke-RestMethod -Uri $uri -Headers @{ Authorization = "Bearer $Secret" }
$response | ConvertTo-Json -Depth 6
