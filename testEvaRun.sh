#!/bin/bash

# 1. Create a new evaluation
curl -X POST http://localhost:3000/evaluations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Capital Cities",
    "description": "Tests whether the model knows basic Physics"
  }'

echo ""

# 2. Create a test case linked to evaluation 4
curl -X POST http://localhost:3000/evaluations/5/test-cases \
  -H "Content-Type: application/json" \
  -d '{
    "input": "What is Quantum Entaglement",
    "expected_output": "Quantum Physics"
  }'

echo ""

# 3. Create an evaluation run using model 2
curl -X POST http://localhost:3000/evaluations/4/run \
  -H "Content-Type: application/json" \
  -d '{
    "modelId": 3
  }'

echo ""

# 4. Execute evaluation run 5
curl -X POST http://localhost:3000/evaluations/5/execute

echo ""