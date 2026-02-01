import requests
import sys
import json
from datetime import datetime

class TradingRangeAPITester:
    def __init__(self, base_url="https://priceband-trader.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if not endpoint.startswith('http') else endpoint
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            success = response.status_code == expected_status
            
            result = {
                "test_name": name,
                "method": method,
                "endpoint": endpoint,
                "expected_status": expected_status,
                "actual_status": response.status_code,
                "success": success,
                "response_data": None,
                "error": None
            }
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    result["response_data"] = response.json()
                except:
                    result["response_data"] = response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                result["error"] = response.text

            self.test_results.append(result)
            return success, response.json() if success and response.text else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            result = {
                "test_name": name,
                "method": method,
                "endpoint": endpoint,
                "expected_status": expected_status,
                "actual_status": None,
                "success": False,
                "response_data": None,
                "error": str(e)
            }
            self.test_results.append(result)
            return False, {}

    def test_root_endpoint(self):
        """Test API root endpoint"""
        return self.run_test("API Root", "GET", "", 200)

    def test_get_tickers(self):
        """Test get supported tickers"""
        success, response = self.run_test("Get Tickers", "GET", "tickers", 200)
        if success and response:
            print(f"   Found {len(response)} tickers: {[t.get('symbol') for t in response]}")
        return success, response

    def test_ticker_data(self, symbol):
        """Test get ticker data for a specific symbol"""
        success, response = self.run_test(f"Get {symbol} Data", "GET", f"ticker/{symbol}", 200)
        if success and response:
            print(f"   Price: ${response.get('price')}, Change: {response.get('change')}%")
        return success, response

    def test_range_calculation(self, symbol):
        """Test range calculation for a symbol"""
        success, response = self.run_test(f"Get {symbol} Range", "GET", f"range/{symbol}", 200)
        if success and response:
            print(f"   Range: ${response.get('low_band')} - ${response.get('high_band')}")
            print(f"   Status: {'INSIDE' if response.get('is_inside_range') else 'OUTSIDE'} RANGE")
        return success, response

    def test_market_status(self):
        """Test market status endpoint"""
        success, response = self.run_test("Market Status", "GET", "market-status", 200)
        if success and response:
            print(f"   Status: {response.get('status')}, Open: {response.get('is_open')}")
        return success, response

    def test_multi_ticker(self):
        """Test multi-ticker endpoint"""
        success, response = self.run_test("Multi-Ticker Data", "GET", "multi-ticker", 200)
        if success and response:
            print(f"   Retrieved data for {len(response)} tickers")
        return success, response

    def test_anchor_operations(self, symbol, price):
        """Test anchor price operations"""
        # Set anchor
        anchor_data = {"symbol": symbol, "price": price}
        success, response = self.run_test(f"Set {symbol} Anchor", "POST", "anchor", 200, data=anchor_data)
        
        if success:
            # Get anchors
            success2, response2 = self.run_test(f"Get {symbol} Anchors", "GET", f"anchors/{symbol}", 200)
            
            # Clear anchors
            success3, response3 = self.run_test(f"Clear {symbol} Anchors", "DELETE", f"anchors/{symbol}", 200)
            
            return success and success2 and success3
        return False

def main():
    print("🚀 Starting 0DTE Trading Range Calculator API Tests")
    print("=" * 60)
    
    tester = TradingRangeAPITester()
    
    # Test basic endpoints
    tester.test_root_endpoint()
    
    # Test tickers
    success, tickers = tester.test_get_tickers()
    
    # Test each supported ticker
    test_symbols = ["SPY", "SPX", "QQQ", "BTC-USD"]
    
    for symbol in test_symbols:
        print(f"\n📊 Testing {symbol}...")
        
        # Test ticker data
        ticker_success, ticker_data = tester.test_ticker_data(symbol)
        
        # Test range calculation
        range_success, range_data = tester.test_range_calculation(symbol)
        
        # Test anchor operations if ticker data is available
        if ticker_success and ticker_data and ticker_data.get('price'):
            tester.test_anchor_operations(symbol, ticker_data['price'])
    
    # Test market status
    tester.test_market_status()
    
    # Test multi-ticker
    tester.test_multi_ticker()
    
    # Print summary
    print(f"\n📊 Test Summary")
    print("=" * 60)
    print(f"Tests run: {tester.tests_run}")
    print(f"Tests passed: {tester.tests_passed}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    # Save detailed results
    with open('/app/test_reports/backend_api_results.json', 'w') as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "tests_run": tester.tests_run,
                "tests_passed": tester.tests_passed,
                "success_rate": (tester.tests_passed/tester.tests_run)*100
            },
            "test_results": tester.test_results
        }, f, indent=2)
    
    # Check for critical failures
    critical_failures = []
    for result in tester.test_results:
        if not result["success"] and result["test_name"] in ["API Root", "Get Tickers", "Market Status"]:
            critical_failures.append(result["test_name"])
    
    if critical_failures:
        print(f"\n❌ Critical failures detected: {critical_failures}")
        return 1
    elif tester.tests_passed < tester.tests_run * 0.8:  # Less than 80% success
        print(f"\n⚠️  Low success rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
        return 1
    else:
        print(f"\n✅ All critical tests passed!")
        return 0

if __name__ == "__main__":
    sys.exit(main())