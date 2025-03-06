# Get the JWT token from .env file
$jwtSecret = (Get-Content .env | Where-Object { $_ -match "^JWT_SECRET=" }).Split('=', 2)[1].Trim()

# Set up the headers
$headers = @{
    "Authorization" = "Bearer $jwtSecret"
    "Content-Type" = "application/json"
}

Write-Host "Using JWT Secret:" $jwtSecret

# Make the request
try {
    Write-Host "Making request to cleanup endpoint..."
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/documents/cleanup" `
        -Method POST `
        -Headers $headers `
        -UseBasicParsing

    Write-Host "Response Status:" $response.StatusCode
    Write-Host "Response Body:" $response.Content
} catch {
    Write-Host "Error Status Code:" $_.Exception.Response.StatusCode.value__
    Write-Host "Error Message:" $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "Error Response Body:" $responseBody
    }
} 