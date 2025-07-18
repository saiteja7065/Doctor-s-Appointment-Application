'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function TestCRUDPage() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (test: string, result: any, success: boolean) => {
    setResults(prev => [...prev, {
      id: Date.now(),
      test,
      result,
      success,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const testGetUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      addResult('GET /api/users', data, response.ok);
    } catch (error) {
      addResult('GET /api/users', { error: (error as Error).message }, false);
    }
    setLoading(false);
  };

  const testCreateUser = async () => {
    setLoading(true);
    try {
      const userData = {
        clerkId: `test_clerk_${Date.now()}`,
        email: `test_${Date.now()}@example.com`,
        firstName: 'Test',
        lastName: 'User',
        role: 'patient'
      };

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });
      
      const data = await response.json();
      addResult('POST /api/users', data, response.ok);
    } catch (error) {
      addResult('POST /api/users', { error: (error as Error).message }, false);
    }
    setLoading(false);
  };

  const testGetSpecificUser = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users/demo_patient_1');
      const data = await response.json();
      addResult('GET /api/users/demo_patient_1', data, response.ok);
    } catch (error) {
      addResult('GET /api/users/demo_patient_1', { error: (error as Error).message }, false);
    }
    setLoading(false);
  };

  const testUpdateUser = async () => {
    setLoading(true);
    try {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        phoneNumber: '+1234567890'
      };

      const response = await fetch('/api/users/demo_patient_1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });
      
      const data = await response.json();
      addResult('PUT /api/users/demo_patient_1', data, response.ok);
    } catch (error) {
      addResult('PUT /api/users/demo_patient_1', { error: (error as Error).message }, false);
    }
    setLoading(false);
  };

  const testDatabaseConnection = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-db');
      const data = await response.json();
      addResult('Database Connection Test', data, response.ok);
    } catch (error) {
      addResult('Database Connection Test', { error: (error as Error).message }, false);
    }
    setLoading(false);
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🧪 Database CRUD Operations Test
        </h1>
        <p className="text-gray-600">
          Test all user CRUD operations and database connectivity
        </p>
      </div>

      {/* Test Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Button 
              onClick={testDatabaseConnection}
              disabled={loading}
              variant="outline"
            >
              🔌 Test DB Connection
            </Button>
            
            <Button 
              onClick={testGetUsers}
              disabled={loading}
              variant="outline"
            >
              📋 GET Users
            </Button>
            
            <Button 
              onClick={testCreateUser}
              disabled={loading}
              variant="outline"
            >
              ➕ CREATE User
            </Button>
            
            <Button 
              onClick={testGetSpecificUser}
              disabled={loading}
              variant="outline"
            >
              👤 GET Specific User
            </Button>
            
            <Button 
              onClick={testUpdateUser}
              disabled={loading}
              variant="outline"
            >
              ✏️ UPDATE User
            </Button>
            
            <Button 
              onClick={clearResults}
              disabled={loading}
              variant="destructive"
            >
              🗑️ Clear Results
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Test Results</h2>
          <Badge variant="outline">
            {results.length} tests run
          </Badge>
        </div>

        {results.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              No tests run yet. Click the buttons above to start testing.
            </CardContent>
          </Card>
        )}

        {results.map((result) => (
          <Card key={result.id} className={`border-l-4 ${
            result.success ? 'border-l-green-500' : 'border-l-red-500'
          }`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {result.success ? '✅' : '❌'} {result.test}
                </CardTitle>
                <Badge variant={result.success ? 'default' : 'destructive'}>
                  {result.timestamp}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
                {JSON.stringify(result.result, null, 2)}
              </pre>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span>Running test...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
