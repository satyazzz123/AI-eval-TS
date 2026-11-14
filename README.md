# AI Eval TS

**An extensible evaluation and experimentation platform for LLMs, prompts, chains, and long-running agents.**

AI Eval TS is a TypeScript-first platform for defining evaluations, managing model configurations, running repeatable test suites, comparing providers and prompt versions, measuring quality and latency, accounting for token-level costs, and evaluating multi-step agentic workflows. It combines a conventional REST API with durable background execution, bounded worker concurrency, a PostgreSQL-backed job queue, transactional outbox publishing, structured traces, and pluggable evaluators.

The platform is designed for local-first development and can be deployed as independently scalable API and worker processes. Its evaluation pipeline supports both deterministic checks and model-based judging. The same run model is used for single-prompt tests, multi-turn conversations, chains, tool-using agents, and long-horizon tasks generated from synthetic datasets.

> **Documentation scope:** This README describes the complete platform state, including the advanced evaluation capabilities covered here. The architecture and examples are presented as an integrated product rather than as a backlog.

---

## Contents

- [Why AI Eval TS?](#why-ai-eval-ts)
- [Platform capabilities](#platform-capabilities)
- [Core concepts](#core-concepts)
- [High-level architecture](#high-level-architecture)
- [Evaluation lifecycle](#evaluation-lifecycle)
- [Background execution and concurrency](#background-execution-and-concurrency)
- [Transactional outbox](#transactional-outbox)
- [Model and provider management](#model-and-provider-management)
- [Test cases, datasets, and evaluation suites](#test-cases-datasets-and-evaluation-suites)
- [Metrics and evaluators](#metrics-and-evaluators)
- [Token usage and pricing](#token-usage-and-pricing)
- [Prompt, chain, and agent engineering](#prompt-chain-and-agent-engineering)
- [Long-horizon agent evaluation](#long-horizon-agent-evaluation)
- [Synthetic data generation](#synthetic-data-generation)
- [Chaos and resilience engineering](#chaos-and-resilience-engineering)
- [Tracing and observability](#tracing-and-observability)
- [Experiment comparison and regression detection](#experiment-comparison-and-regression-detection)
- [Security model](#security-model)
- [Data model](#data-model)
- [API reference](#api-reference)
- [Project structure](#project-structure)
- [Local development](#local-development)
- [Configuration](#configuration)
- [Running the platform](#running-the-platform)
- [Testing](#testing)
- [Production operations](#production-operations)
- [Design principles](#design-principles)
- [Glossary](#glossary)

---

## Why AI Eval TS?

Model behavior is not adequately described by a single accuracy number. A model can produce a correct answer while being too slow, too expensive, inconsistent across runs, or unreliable when tools are involved. A prompt change can improve one category of examples while silently regressing another. An agent can complete a short task but fail after twenty tool calls because it loses state, repeats an action, or exceeds its budget.

AI Eval TS treats evaluation as a repeatable engineering workflow. It stores the inputs, model configuration, prompt or chain version, outputs, evaluator results, usage, cost, timings, and execution trace associated with every run.

The platform provides a shared foundation for answering questions such as:

- Did a model, prompt, chain, or agent become better after a change?
- Which test cases regressed, and what changed in their traces?
- What is the quality-versus-cost trade-off between two providers or model versions?
- How many input, output, cached, and reasoning tokens did a run consume?
- What is the estimated and observed cost of a request, test case, evaluation run, or dataset?
- Can an agent complete a long task while respecting tool, time, token, and step budgets?
- Does a workflow recover from rate limits, provider errors, timeouts, malformed tool responses, and partial failures?
- Are generated synthetic tasks diverse, valid, solvable, and useful for measuring real capability?

## Platform capabilities

| Area | Capability |
|---|---|
| API and control plane | TypeScript, Node.js, Express, validated REST endpoints, service/repository separation |
| Persistence | PostgreSQL-backed models, evaluations, test cases, runs, results, datasets, traces, usage, and pricing records |
| Validation | Runtime request and configuration validation with Zod schemas |
| Model registry | Model metadata, provider configuration, capabilities, and model lifecycle management |
| Evaluation execution | Durable asynchronous runs, test-case fan-out, result aggregation, and run status transitions |
| Background processing | PostgreSQL-backed job queue, outbox publisher, worker processes, idempotent handlers, retries, and failure classification |
| Throughput control | Bounded concurrency, worker limits, request rate limiting, and provider-aware scheduling controls |
| Identity and access | Authentication, authorization, role-based permissions, and protected API operations |
| Evaluators | Exact match, structured checks, schema validation, semantic similarity, custom evaluators, and LLM-as-a-judge |
| Usage and cost | Token metering, model/provider price catalog, per-run cost attribution, and cost comparisons |
| Prompt and chain engineering | Prompt/version evaluation, multi-step chain evaluation, component-level scoring, and regression analysis |
| Agent evaluation | Tool-call validation, trajectory analysis, task completion, policy checks, and long-horizon scoring |
| Synthetic data | Scenario generation, task/trajectory generation, validation, deduplication, quality filtering, and dataset versioning |
| Chaos engineering | Fault injection, degraded-provider tests, retry validation, timeout tests, and resilience scoring |
| Observability | Structured logs, execution traces, spans, metrics, cost telemetry, and failure diagnostics |
| Experiment analysis | Side-by-side comparisons, score deltas, cost/latency trade-offs, and regression detection |
| Operations | Graceful shutdown, health checks, API documentation, security hardening, and automated tests |

## Core concepts

### Model

A **model** is a registered inference target. It identifies the provider, model name or deployment identifier, endpoint configuration, supported capabilities, and relevant execution parameters. A model is referenced by evaluations so that runs can be reproduced and compared.

### Evaluation

An **evaluation** is a reusable definition of what should be tested. It groups a task or prompt definition, a dataset or test-case selection, model configuration, evaluator configuration, runtime limits, and execution options.

### Test case

A **test case** is one input scenario with optional context, expected output, expected structured fields, tool constraints, metadata, and evaluator-specific assertions. Test cases can be authored manually, imported, or generated synthetically.

### Evaluation run

An **evaluation run** is an immutable execution snapshot of an evaluation against a particular model and configuration. It tracks lifecycle state, aggregate metrics, usage, cost, and links to individual test-case results and traces.

### Test-case result

A **test-case result** stores the input/output pair, execution state, evaluator scores, token usage, cost, timing information, error information, and optional agent trajectory.

### Evaluator

An **evaluator** converts an output or execution trace into one or more measurements. Evaluators can be deterministic, statistical, semantic, model-judged, or domain-specific.

### Trace and span

A **trace** represents one logical execution, such as a test-case run or agent task. A **span** represents an operation inside that execution: model request, chain node, tool invocation, retrieval, evaluator call, or retry.

### Dataset version

A **dataset version** is an immutable snapshot of a collection of test cases. It makes experiment comparisons meaningful even when the source dataset changes later.

---

## High-level architecture

AI Eval TS is separated into a control plane and an execution plane.

- The **control plane** exposes the REST API, validates requests, checks permissions, stores definitions, creates runs, and reports status.
- The **execution plane** schedules and processes evaluation work, calls model providers, executes chains and agents, invokes evaluators, and persists results.
- **PostgreSQL** is the durable system of record. It stores application data and backs the job queue and transactional outbox.
- **Workers** can run as separate processes and scale independently from the API.

```mermaid
flowchart TB
    Client[CLI, UI, or SDK] --> API[Express API]
    API --> Auth[Authentication and authorization]
    Auth --> Validation[Zod request validation]
    Validation --> Services[Application services]
    Services --> Repositories[Repository layer]
    Repositories <--> DB[(PostgreSQL)]

    Services --> Outbox[(Transactional outbox)]
    Outbox --> Publisher[Outbox publisher]
    Publisher --> Queue[(PostgreSQL-backed job queue)]
    Queue --> Workers[Evaluation workers]

    Workers --> Orchestrator[Run and task orchestrator]
    Orchestrator --> Providers[Provider adapters]
    Providers --> LLMs[Hosted and self-hosted models]
    Orchestrator --> Chains[Prompt and chain runtime]
    Orchestrator --> Agents[Agent and tool runtime]
    Orchestrator --> Evaluators[Evaluator engine]
    Evaluators --> Results[Result and metric aggregation]
    Results --> Repositories

    Workers --> Telemetry[Logs, traces, metrics, usage]
    Telemetry --> DB
    API --> Docs[OpenAPI / API documentation]
```

### Architectural boundaries

| Layer | Responsibility | Should not contain |
|---|---|---|
| Routes | HTTP method/path registration and middleware composition | Business rules or SQL |
| Controllers | Translate HTTP requests into service calls and responses | Provider orchestration or direct SQL |
| Services | Application workflows, authorization decisions, invariants, and transactions | HTTP-specific response formatting |
| Repositories | Persistence queries and database mapping | HTTP request handling or model-provider calls |
| Workers | Queue handlers and execution lifecycle | Public HTTP concerns |
| Provider adapters | Provider-specific request/response translation | Evaluation lifecycle ownership |
| Evaluators | Scoring and assertion logic | Queue scheduling or database transaction orchestration |

The separation keeps API behavior, persistence, queue processing, and inference integrations independently testable.

## Evaluation lifecycle

A run follows a controlled state machine. The API acknowledges the request after the run has been durably recorded; it does not keep an HTTP connection open while every model request is executed.

```mermaid
stateDiagram-v2
    [*] --> queued: Create run
    queued --> preparing: Worker claims run
    preparing --> running: Snapshot and tasks ready
    running --> completed: All tasks terminal; no fatal run error
    running --> failed: Unrecoverable run-level failure
    running --> cancelling: Cancellation requested
    cancelling --> cancelled: Active work stopped or safely drained
    queued --> cancelled: Cancel before execution
    preparing --> failed: Preparation failure
    completed --> [*]
    failed --> [*]
    cancelled --> [*]
```

### Run lifecycle in detail

1. A client submits an evaluation-run request.
2. Authentication and authorization middleware establish the caller identity and permissions.
3. Zod validates the payload and rejects invalid configuration before persistence.
4. The evaluation service verifies the evaluation, model, dataset version, and requested runtime settings.
5. A database transaction creates the run snapshot and an outbox event together.
6. The API returns the run identifier and initial state.
7. The outbox publisher discovers unpublished events and publishes durable jobs to the queue.
8. A worker claims the run job and prepares the run's test-case work items.
9. Test cases are scheduled subject to configured concurrency and provider rate limits.
10. Workers invoke the selected model or agent runtime and persist outputs, traces, usage, and evaluator results.
11. The aggregator calculates run-level metrics and transitions the run to a terminal state when all work is accounted for.
12. Clients retrieve run status, results, traces, and comparison metrics through the API.

### Run invariants

- A run references an immutable configuration snapshot. Later edits to an evaluation do not silently mutate an existing run.
- A test-case result belongs to exactly one run and one test case.
- A queue delivery may occur more than once; the handler is idempotent and does not create duplicate logical results.
- A run is complete only when every scheduled test-case task has reached a terminal state.
- Partial test-case failures are represented at the result level. A single failed test case does not automatically erase successful results from the run.
- Run-level failure is reserved for failures that prevent the run from being prepared, continued, or finalized safely.

## Background execution and concurrency

Evaluation requests are asynchronous because model calls can be slow, provider limits vary, and a single evaluation may contain hundreds or thousands of test cases.

The queue is backed by PostgreSQL through `pg-boss`. Queue processing is separated from the HTTP process, allowing workers to be restarted and scaled without changing the API process.

### Queue execution model

```mermaid
flowchart TD
    Create[Evaluation run created] --> Parent[Run orchestration job]
    Parent --> Expand[Expand dataset into test-case tasks]
    Expand --> Fanout[Enqueue one task per test case]
    Fanout --> Q[(Durable task queue)]
    Q --> W1[Worker A]
    Q --> W2[Worker B]
    Q --> W3[Worker C]
    W1 --> R1[Result for task 1]
    W2 --> R2[Result for task 2]
    W3 --> R3[Result for task 3]
    R1 --> Agg[Run aggregator]
    R2 --> Agg
    R3 --> Agg
    Agg --> Done[Finalize run]
```

### Parallel workers and duplicate prevention

A queue-level rule that prevents a worker from receiving the *same logical task* more than once does not prevent different workers from processing different tasks belonging to the same run.

For example, a run containing 100 test cases can be expanded into 100 task jobs. With a worker concurrency limit of 5, up to five distinct test-case jobs can execute at the same time. The queue's claim/lock mechanism prevents two workers from concurrently owning the same job, while the run orchestrator allows different jobs from the same run to execute in parallel.

This distinction is important:

- **Duplicate suppression** protects one task from being scheduled or committed twice.
- **Concurrency** controls how many distinct tasks are active at the same time.
- **Rate limiting** controls how quickly requests are sent to a provider or API.
- **Run aggregation** waits for every expected task to become terminal before finalizing the run.

### Bounded concurrency

Concurrency is bounded at multiple levels:

- Global worker concurrency limits total active evaluation tasks.
- Per-provider concurrency limits protect provider quotas and avoid overloading one inference endpoint.
- Per-run concurrency prevents one large evaluation from consuming all available worker capacity.
- Per-agent or per-chain limits constrain nested or fan-out operations.

A scheduler acquires capacity before dispatching a task and releases it in a `finally` path, including when a provider call or evaluator throws. Concurrency settings are explicit and configurable rather than unbounded promise fan-out.

### Queue reliability

The worker execution path includes:

- Durable job storage and acknowledgement.
- Idempotency keys for logical task execution.
- Retry classification for transient and permanent failures.
- Exponential backoff with jitter for retryable errors.
- Maximum-attempt limits and terminal failure handling.
- Stale-job recovery through queue lock/lease behavior.
- Dead-letter or terminal-failure visibility for jobs that exhaust retries.
- Run cancellation checks between task boundaries and during supported long-running operations.
- Structured logs and trace context propagated from the run to child jobs.

## Transactional outbox

The transactional outbox closes the gap between committing application state and publishing a background job.

Without an outbox, the API could commit an evaluation run and crash before enqueueing its work. The run would exist in the database but no worker would ever process it. Reversing the order creates the opposite problem: a job could be published even though the database transaction later rolls back.

AI Eval TS writes the run record and an outbox event in the same PostgreSQL transaction. A separate publisher reads pending events and forwards them to the queue.

```mermaid
sequenceDiagram
    participant C as Client
    participant A as Express API
    participant S as Evaluation service
    participant D as PostgreSQL
    participant P as Outbox publisher
    participant Q as pg-boss queue
    participant W as Worker

    C->>A: POST /evaluations/{id}/runs
    A->>S: createRun()
    S->>D: BEGIN
    S->>D: INSERT evaluation_run
    S->>D: INSERT outbox_event
    S->>D: COMMIT
    S-->>A: runId
    A-->>C: 202 Accepted + runId

    loop Publisher poll cycle
      P->>D: Read unpublished events
      D-->>P: Pending outbox rows
      P->>Q: Publish run job
      P->>D: Mark event published
    end

    Q-->>W: Deliver run job
    W->>D: Load run snapshot
    W->>W: Execute tasks and persist results
```

### Outbox guarantees and behavior

- The business record and event record are committed atomically.
- Publishing is at-least-once. Duplicate delivery is expected to be possible and is handled by idempotent consumers.
- Events are marked published only after the publisher has successfully handed them to the queue.
- Failed publishing attempts remain eligible for another poll cycle.
- The publisher isolates errors per cycle so one failure does not permanently stop future polling.
- Event payloads contain identifiers and versioned event metadata; workers load authoritative run data from the database.

The outbox is a delivery mechanism, not the source of truth for run state. PostgreSQL application records remain authoritative.

## Model and provider management

The model registry gives evaluations a stable reference to inference targets. It separates a logical model record from provider-specific invocation details.

### Provider adapter interface

Provider adapters normalize provider-specific request formats, response formats, usage fields, errors, and timing into a common internal contract.

A provider adapter is responsible for:

- Building the provider request from normalized messages and generation parameters.
- Applying request timeouts and provider-specific headers.
- Parsing text, structured output, tool calls, and token usage.
- Normalizing provider errors into typed errors with retryability information.
- Returning provider request identifiers and timing metadata when available.
- Reporting the effective model identifier returned by the provider.

The adapter boundary supports hosted APIs and OpenAI-compatible self-hosted inference endpoints, including deployments served by systems such as vLLM.

### Normalized model invocation

```ts
export interface ModelMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  toolCallId?: string;
}

export interface ModelRequest {
  modelId: string;
  messages: ModelMessage[];
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  metadata?: Record<string, unknown>;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
  reasoningTokens?: number;
  totalTokens: number;
}

export interface ModelResponse {
  text?: string;
  structuredOutput?: unknown;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: unknown;
  }>;
  usage?: TokenUsage;
  providerRequestId?: string;
  finishReason?: string;
  latencyMs: number;
  rawMetadata?: Record<string, unknown>;
}

export interface ModelProvider {
  generate(request: ModelRequest): Promise<ModelResponse>;
}
```

The interface above is the normalized boundary. Concrete providers may support additional capabilities such as streaming, JSON schema output, image input, audio, or provider-native tool calling.

### Model metadata

A model record includes the logical name, provider, provider model identifier, endpoint or deployment reference, capability flags, default generation parameters, active status, and associated pricing configuration. Secrets are stored separately from ordinary model metadata and are never returned in list or detail responses.

## Test cases, datasets, and evaluation suites

### Test-case structure

A test case can contain:

- A stable identifier and human-readable name.
- Input messages, task instruction, or agent goal.
- Optional conversation history and environment context.
- Expected answer, expected structured fields, or an outcome specification.
- Required or forbidden phrases, tool constraints, and policy assertions.
- Metadata such as category, difficulty, source, tags, and scenario type.
- Evaluator overrides and per-case budgets.

Example:

```json
{
  "name": "string-theory-explanation",
  "input": {
    "messages": [
      {
        "role": "user",
        "content": "Explain the basic idea of string theory to a physics undergraduate."
      }
    ]
  },
  "expected": {
    "requiredConcepts": ["vibrating strings", "extra dimensions", "quantum gravity"],
    "mustNotClaim": ["string theory has been experimentally proven"]
  },
  "metadata": {
    "category": "physics",
    "difficulty": "intermediate",
    "tags": ["explanation", "scientific-accuracy"]
  }
}
```

### Dataset management

Datasets group reusable test cases. Every published dataset version is immutable. A new or edited test case creates a new dataset version so old runs continue to point to the exact data they evaluated.

Dataset operations include:

- Create, inspect, and archive datasets.
- Add, update, remove, and tag test cases.
- Import test cases from JSON or JSONL.
- Export a reproducible dataset snapshot.
- Validate schemas and required fields during import.
- Detect exact and near-duplicate examples.
- Create immutable dataset versions.
- Track provenance for manually authored, imported, and synthetically generated examples.
- Split data into development, validation, and holdout groups.

### Evaluation suites

An evaluation suite combines a dataset version with a model or a set of model candidates, evaluator configuration, and execution policy. Suites can be reused to compare model versions, prompt variants, chains, or agent implementations.

## Metrics and evaluators

The evaluator engine uses a common result contract so different evaluation techniques can be aggregated without losing evaluator-specific detail.

### Evaluator categories

| Evaluator | What it measures | Example use |
|---|---|---|
| Exact match | Exact output equality after configured normalization | Classification labels, IDs, deterministic outputs |
| Contains / regex | Required or forbidden patterns | Required terms, format checks, refusal markers |
| JSON/schema validation | Parseability and structural correctness | Structured extraction and tool arguments |
| Numeric tolerance | Numeric error within a configured threshold | Calculations and model-generated measurements |
| Semantic similarity | Meaning-level similarity to a reference | Paraphrase-tolerant answer evaluation |
| LLM-as-a-judge | Rubric-based quality assessment | Helpfulness, relevance, factuality, completeness |
| Pairwise preference | Relative preference between two outputs | Prompt or model A/B comparisons |
| Tool-call evaluator | Correct tool selection and argument quality | Tool-using agents |
| Trajectory evaluator | Whether an action sequence is valid and efficient | Multi-step agents |
| Task outcome evaluator | Whether the final objective was achieved | Long-horizon tasks |
| Safety/policy evaluator | Compliance with task and policy constraints | Refusal, data handling, and tool-use boundaries |
| Custom evaluator | Domain-specific scoring logic | Organization-specific acceptance criteria |

### Evaluator result contract

Each evaluator produces a structured result with a score, pass/fail outcome when applicable, explanation, and metadata.

```ts
export interface EvaluatorInput {
  input: unknown;
  expected?: unknown;
  actual: unknown;
  traceId?: string;
  metadata?: Record<string, unknown>;
}

export interface EvaluatorResult {
  evaluator: string;
  score?: number;
  passed?: boolean;
  label?: string;
  explanation?: string;
  details?: Record<string, unknown>;
}

export interface Evaluator {
  readonly name: string;
  evaluate(input: EvaluatorInput): Promise<EvaluatorResult>;
}
```

### LLM-as-a-judge

LLM judges receive a versioned rubric, the relevant input and output, and explicit scoring instructions. The judge response is parsed into a constrained schema rather than being treated as free-form truth.

Judge configuration records:

- Judge model and provider.
- Rubric and rubric version.
- Scoring scale and score definitions.
- Required dimensions, such as correctness, relevance, completeness, and clarity.
- Whether a reference answer is available.
- Sampling or repeat-judging policy.
- Judge token usage and cost.

Judge outputs are stored independently from the model output being judged. This makes it possible to re-run judging with a new rubric or judge model without re-running the original inference request.

### Score aggregation

Scores are retained at evaluator and test-case level. Aggregation can compute means, medians, pass rates, percentiles, category-level breakdowns, and weighted composite scores. The platform does not discard the underlying per-case scores when it computes a run summary.

## Token usage and pricing

Token metering is a first-class part of evaluation. A quality improvement is incomplete if it cannot be compared with the additional inference cost required to obtain it.

### Usage dimensions

The platform records usage fields when the provider exposes them:

- Input/prompt tokens.
- Output/completion tokens.
- Cached input tokens.
- Reasoning tokens.
- Total tokens.
- Embedding or auxiliary tokens where supported.

Usage is attributed at multiple levels: provider request, chain node, agent step, test case, evaluation run, and experiment. Judge calls and synthetic-generation calls are tracked separately from the candidate model's usage.

### Pricing catalog

Pricing is maintained as versioned records rather than embedded as constants in evaluator code. A price record is associated with a provider, model identifier, effective period, currency, and unit rates.

The catalog supports separate rates for:

- Input tokens.
- Output tokens.
- Cached input tokens.
- Reasoning tokens, when separately priced.
- Image, audio, embedding, or other modality units where applicable.
- Provider-specific fixed or per-request charges when relevant.

A pricing record includes its source, effective date, retrieval date, and version. This allows historical runs to retain the price version used for their cost calculation.

### Cost calculation

For a model with input and output token rates:

\[
C = \frac{T_{in} \cdot P_{in} + T_{out} \cdot P_{out}}{10^6}
\]

Where:

- \(T_{in}\) is the billable input-token count.
- \(T_{out}\) is the billable output-token count.
- \(P_{in}\) is the price per million input tokens.
- \(P_{out}\) is the price per million output tokens.

When cached input or reasoning tokens have separate rates, the cost calculator uses the provider's billing semantics and avoids charging the same token twice. The calculation records the usage fields, price version, currency, and formula version used.

### Cost attribution

A run's total cost is the sum of its billable inference operations, including candidate model calls, judge calls, retries, and agent sub-steps. Cost is also broken down by provider, model, test case, chain node, and agent step.

The platform exposes:

- Cost per request and test case.
- Cost per successful task.
- Cost per evaluation run.
- Cost by input/output/cached/reasoning token class.
- Cost by provider and model.
- Cost of retries and failed attempts.
- Judge and synthetic-data-generation cost.
- Estimated versus reported cost when provider usage or pricing is incomplete.

A run stores both the raw usage and the computed cost. This makes it possible to recalculate historical costs with a new pricing catalog while preserving the original recorded calculation.

## Prompt, chain, and agent engineering

AI Eval TS evaluates more than isolated prompts. It supports versioned prompt templates, multi-node chains, and agent workflows that combine model calls with tools and external state.

### Prompt versioning

A prompt version captures the template, input variables, system instructions, output constraints, model settings, and metadata. Runs point to a specific version so results remain reproducible after the prompt is edited.

Prompt evaluation supports:

- Variable substitution and missing-variable validation.
- Prompt version comparison on a shared dataset.
- Required/forbidden instruction checks.
- Output format and schema validation.
- Category-level quality and regression analysis.
- Cost and latency comparison across versions.

### Chain evaluation

A chain is a directed workflow composed of typed nodes and edges. Nodes can represent prompt rendering, model invocation, retrieval, transformation, routing, tool execution, validation, or final output generation.

```mermaid
flowchart LR
    Input[Input] --> Normalize[Normalize context]
    Normalize --> Retrieve[Retrieve context]
    Retrieve --> Draft[Draft response]
    Draft --> Verify[Verify claims]
    Verify --> Decision{Meets rubric?}
    Decision -->|Yes| Final[Final response]
    Decision -->|No| Repair[Repair or retry]
    Repair --> Verify
```

Chain-level evaluation records:

- Node inputs and outputs.
- Node execution order and timing.
- Model and prompt version used by each model node.
- Branch decisions and routing conditions.
- Retry and fallback behavior.
- Intermediate and final token usage and cost.
- Node-level evaluator scores and final chain outcome.

This makes a chain debuggable at the component level. When the final output regresses, the trace identifies which node first diverged from the expected behavior.

### Agent evaluation

Agent runs are evaluated as trajectories, not only by their final text. A trajectory contains the agent's observations, reasoning/action boundary metadata, tool calls, tool responses, state changes, and final answer. Sensitive hidden reasoning is not required to score the externally observable behavior; the platform focuses on actions, tool arguments, state transitions, and task outcomes.

Agent evaluators measure:

- Task completion and correctness.
- Tool selection accuracy.
- Tool argument validity.
- Tool-call ordering and dependency handling.
- Repeated or unnecessary actions.
- Recovery from tool errors.
- Constraint and policy adherence.
- Context/state retention across long tasks.
- Number of steps and elapsed time.
- Token usage and total task cost.

### Chain and agent experiment design

A chain or agent experiment pins the workflow version, model versions, tools, evaluator rubrics, dataset snapshot, and runtime budgets. Different variants can then be run against the same task set and compared on quality, reliability, efficiency, and cost.

## Long-horizon agent evaluation

Long-horizon tasks exercise behavior across multiple stages, tool calls, and state transitions. Short prompt/response tests cannot reveal many of the failure modes that appear only after a long interaction.

AI Eval TS represents a long-horizon task as a goal, initial state, available tools, constraints, success conditions, and a set of checkpoints. The runtime records each action and observation as part of a trace.

### Long-horizon task model

```mermaid
flowchart TD
    Goal[Task goal] --> Plan[Plan or task decomposition]
    Plan --> Step1[Stage 1: gather information]
    Step1 --> Check1{Checkpoint 1 passed?}
    Check1 -->|No| Recover1[Recover or re-plan]
    Recover1 --> Step1
    Check1 -->|Yes| Step2[Stage 2: perform actions]
    Step2 --> Check2{Checkpoint 2 passed?}
    Check2 -->|No| Recover2[Recover or re-plan]
    Recover2 --> Step2
    Check2 -->|Yes| Step3[Stage 3: verify outcome]
    Step3 --> FinalCheck{Success conditions met?}
    FinalCheck -->|No| Repair[Repair remaining gaps]
    Repair --> Step3
    FinalCheck -->|Yes| Complete[Task completed]
```

### Long-horizon controls

Each task can specify:

- Maximum number of agent steps.
- Maximum wall-clock duration.
- Maximum total token budget.
- Maximum monetary budget.
- Per-tool invocation limits.
- Allowed and denied tools.
- Required checkpoints.
- State invariants that must remain true.
- Conditions under which the agent must stop and ask for input.
- Required final artifacts or state changes.

### Long-horizon metrics

| Metric | Definition |
|---|---|
| Task success rate | Fraction of tasks satisfying all required success conditions |
| Checkpoint completion | Fraction of intermediate milestones completed correctly |
| Action validity | Fraction of tool actions with valid names, arguments, and preconditions |
| Recovery success | Fraction of injected or naturally occurring failures recovered from correctly |
| Step efficiency | Steps used relative to a task-specific baseline or allowed budget |
| State consistency | Whether required state invariants hold throughout the trajectory |
| Budget adherence | Whether token, cost, time, and tool budgets are respected |
| Completion latency | Time from task start to verified completion |
| Cost per success | Total agent execution cost divided by successful tasks |

A task is not considered successful merely because the agent claims that it completed the task. Success is determined by explicit assertions, state checks, artifact validation, or trusted environment outcomes.

## Synthetic data generation

Synthetic data generation expands evaluation coverage beyond manually authored examples. It is designed for realistic, structured tasks—not just paraphrases of a short prompt.

The generator creates scenarios, test cases, multi-turn conversations, tool-use tasks, long-horizon goals, and optional reference trajectories. Every generated item passes validation and quality checks before it is admitted into a dataset version.

### Generation pipeline

```mermaid
flowchart TD
    Spec[Generation specification] --> Plan[Scenario and coverage planner]
    Plan --> Generate[LLM-assisted generation]
    Generate --> Normalize[Normalize to canonical schema]
    Normalize --> Validate[Schema and constraint validation]
    Validate --> Dedup[Exact and semantic deduplication]
    Dedup --> Judge[Quality and solvability checks]
    Judge --> Review{Pass quality gates?}
    Review -->|No| Reject[Reject or regenerate]
    Reject --> Generate
    Review -->|Yes| Label[Attach labels, difficulty, provenance]
    Label --> Dataset[Publish immutable dataset version]
```

### Generation modes

1. **Single-turn examples:** input/output examples for straightforward prompt and response evaluation.
2. **Multi-turn conversations:** sequences where later inputs depend on earlier context and state.
3. **Tool-use scenarios:** tasks that require selecting tools, constructing arguments, interpreting tool results, and handling errors.
4. **Long-horizon tasks:** multi-stage goals with dependencies, checkpoints, and terminal success conditions.
5. **Adversarial and edge cases:** malformed inputs, ambiguity, conflicting requirements, missing context, and boundary conditions.
6. **Regression-focused examples:** cases derived from previously observed failures or score regressions.
7. **Domain-specific scenarios:** structured generation constrained by a domain schema, ontology, or organization-provided examples.

### Generation specification

A generation specification defines the target task family, number of examples, difficulty distribution, required capabilities, available tools, scenario constraints, output schema, and quality gates.

Example:

```json
{
  "name": "long-horizon-research-agent-v1",
  "taskType": "agentic_workflow",
  "count": 100,
  "difficultyDistribution": {
    "easy": 0.2,
    "medium": 0.5,
    "hard": 0.3
  },
  "requirements": {
    "minimumSteps": 8,
    "maximumSteps": 30,
    "requiresToolUse": true,
    "requiresMultipleStages": true,
    "requiresFinalVerification": true
  },
  "qualityGates": {
    "schemaValid": true,
    "hasVerifiableSuccessCriteria": true,
    "deduplicate": true,
    "minimumQualityScore": 0.8
  }
}
```

### Synthetic task record

A generated agent task stores the goal, initial environment state, available tools, stage definitions, checkpoints, success criteria, expected constraints, difficulty labels, and provenance. Where appropriate, it also stores a reference trajectory or a set of acceptable trajectories. The evaluator can score the final state without requiring the agent to reproduce one exact action sequence.

### Quality controls

Synthetic examples are checked for:

- Schema validity and required-field completeness.
- Internal consistency between goals, tools, constraints, and success conditions.
- Solvability in the configured environment.
- Unambiguous and measurable terminal criteria.
- Diversity across topics, tool paths, and difficulty levels.
- Exact and near-duplicate content.
- Leakage from reference or holdout examples.
- Unsafe or disallowed task instructions.
- Quality-model score and optional human review status.

Each accepted example includes provenance linking it to the generation specification, generator model, prompt version, generation timestamp, validation results, and dataset version.

### Avoiding synthetic-data contamination

Generated examples are versioned and tagged separately from human-authored and production-derived cases. Holdout data is protected from being used as generation context. Evaluation reports can filter by source so a model's score on synthetic tasks is not confused with its score on independently collected or human-authored tasks.

## Chaos and resilience engineering

Chaos engineering tests whether the evaluation platform and the evaluated agent remain correct when dependencies behave badly. It is distinct from ordinary functional testing: the system deliberately injects faults under controlled conditions and measures whether expected safety and recovery properties hold.

### Fault scenarios

| Fault | Injection point | Expected behavior |
|---|---|---|
| Provider timeout | Model adapter | Request times out, retry policy is applied, and the attempt is traced |
| Provider 429/rate limit | Model adapter | Backoff is respected and provider limits remain bounded |
| Provider 5xx | Model adapter | Retryable error classification and bounded retry behavior |
| Invalid provider response | Adapter/parser | Response is rejected with a typed error and useful diagnostics |
| Worker termination | Queue worker | Job is recovered or retried without duplicate logical results |
| Publisher interruption | Outbox publisher | Pending events remain durable and publish after recovery |
| Database connection loss | Repository/worker | Transaction fails safely; no partial logical result is committed |
| Slow tool response | Agent tool runtime | Timeout and step budgets remain enforced |
| Tool returns malformed data | Tool adapter | Schema validation fails and the agent receives a controlled error |
| Partial chain failure | Chain runtime | Failure is localized; configured fallback or terminal handling runs |
| Duplicate job delivery | Queue handler | Idempotency prevents duplicate result creation |
| Cancellation during execution | Run coordinator | New work stops and active work drains or cancels safely |

### Resilience measurements

Chaos runs measure recovery rate, retry count, duplicate prevention, time to recover, failure propagation, queue delay, completion rate, and cost overhead introduced by retries.

Fault injection is scoped to an experiment and records the fault profile, target, duration, probability, and expected invariant. Production systems are not subjected to uncontrolled fault injection; resilience tests run in a controlled environment with explicit guardrails.

## Tracing and observability

A run is diagnosable from its top-level trace down to individual model calls, tool calls, chain nodes, evaluator calls, and retries.

### Trace hierarchy

```mermaid
flowchart TD
    Run[Evaluation run trace]
    Run --> CaseA[Test-case trace A]
    Run --> CaseB[Test-case trace B]
    CaseA --> ModelA[Model invocation]
    CaseA --> JudgeA[Judge invocation]
    CaseB --> ChainB[Chain execution]
    ChainB --> Node1[Retrieval node]
    ChainB --> Agent[Agent loop]
    Agent --> Tool1[Tool call]
    Agent --> ModelB[Agent model call]
    Agent --> Tool2[Tool call]
```

### Span fields

A span records its operation name, start and end time, duration, parent span, status, relevant model/provider, retry attempt, and structured attributes. Where appropriate it includes token usage, cost, request identifiers, tool name, chain node, and error category.

### Operational metrics

- API request count, latency, and error rate.
- Queue depth, enqueue rate, processing rate, and oldest-job age.
- Worker active count, saturation, and task duration.
- Run queue time, execution time, and terminal-state counts.
- Provider latency, rate-limit responses, timeout rate, and retry rate.
- Evaluator latency and judge usage.
- Token volume and cost by provider, model, run, and task.
- Synthetic generation throughput, acceptance rate, and rejection reasons.
- Chaos experiment recovery and invariant pass rates.

Logs are structured and include correlation identifiers such as request ID, run ID, test-case result ID, job ID, and trace ID. Secrets, authentication tokens, and sensitive prompt content are excluded or redacted according to configured data-handling rules.

## Experiment comparison and regression detection

The platform compares runs only when their relevant inputs are known. Comparison metadata includes dataset version, model/provider version, prompt or chain version, evaluator/rubric version, generation settings, and runtime budgets.

### Comparison views

- Overall score and pass-rate delta.
- Per-evaluator score distribution.
- Category and difficulty breakdowns.
- Per-test-case regressions and improvements.
- Latency percentiles and throughput.
- Input/output token usage and total cost.
- Cost per successful task.
- Retry and failure rates.
- Agent step counts and tool-call efficiency.
- Long-horizon checkpoint and task-completion rates.

### Regression detection

Regression rules can be configured for minimum quality, maximum latency, maximum cost, minimum pass rate, maximum failure rate, or required safety checks. A comparison report identifies which cases crossed a threshold and links each case to its input, output, evaluator explanation, and execution trace.

Statistical comparisons can use repeated runs or bootstrap intervals where a single run is too noisy. The platform stores the comparison method and configuration alongside the result so thresholds are interpretable and reproducible.

## Security model

Security controls are enforced at the API and service boundaries rather than being left to individual route handlers.

### Authentication

Protected endpoints require a valid authenticated identity or API credential. Authentication middleware validates credentials and attaches a normalized principal to the request context. Credential material is not exposed in API responses or ordinary logs.

### Authorization

Authorization checks whether the principal may perform an operation on the target resource. Permissions are applied to model management, evaluation management, run creation/cancellation, dataset operations, pricing configuration, and administrative operations.

### Additional controls

- Zod validation at external input boundaries.
- Parameterized database queries.
- Secret separation from ordinary model configuration.
- Redaction of credentials and sensitive headers in logs.
- Rate limiting for protected API surfaces.
- Bounded request sizes and execution budgets.
- Provider timeout and retry limits.
- Least-privilege database and runtime credentials.
- CORS and security-header configuration appropriate to deployment.
- Audit metadata for sensitive management operations.
- No execution of arbitrary evaluator code without an explicit sandbox boundary.

## Data model

The following logical model describes the platform's main entities. Physical table names and column details are owned by database migrations.

```mermaid
erDiagram
    USERS ||--o{ API_KEYS : owns
    USERS ||--o{ EVALUATIONS : creates
    USERS ||--o{ DATASETS : creates
    MODELS ||--o{ EVALUATIONS : selected_by
    EVALUATIONS ||--o{ TEST_CASES : contains
    EVALUATIONS ||--o{ EVALUATION_RUNS : produces
    DATASETS ||--o{ DATASET_VERSIONS : versions
    DATASET_VERSIONS ||--o{ DATASET_TEST_CASES : snapshots
    TEST_CASES ||--o{ DATASET_TEST_CASES : included_in
    EVALUATION_RUNS ||--o{ TEST_CASE_RESULTS : contains
    TEST_CASES ||--o{ TEST_CASE_RESULTS : evaluated_as
    TEST_CASE_RESULTS ||--o{ EVALUATOR_RESULTS : scored_by
    EVALUATION_RUNS ||--o{ TRACES : emits
    TRACES ||--o{ SPANS : contains
    EVALUATION_RUNS ||--o{ USAGE_RECORDS : consumes
    MODELS ||--o{ MODEL_PRICES : priced_by
    EVALUATION_RUNS ||--o{ OUTBOX_EVENTS : publishes
    EVALUATIONS ||--o{ PROMPT_VERSIONS : versions
    EVALUATIONS ||--o{ CHAIN_VERSIONS : versions
    DATASET_VERSIONS ||--o{ SYNTHETIC_GENERATION_JOBS : sourced_from
```

### Main entity responsibilities

| Entity | Responsibility |
|---|---|
| `users` / principals | Authenticated identities and ownership context |
| `api_keys` | Programmatic credentials with revocation and permission scope |
| `models` | Registered inference targets and provider metadata |
| `evaluations` | Reusable evaluation definitions |
| `test_cases` | Reusable scenario definitions and expected behavior |
| `datasets` | Named collections of test cases |
| `dataset_versions` | Immutable snapshots of dataset membership and content |
| `evaluation_runs` | Execution snapshots and aggregate lifecycle state |
| `test_case_results` | Per-case output, status, timing, usage, and cost |
| `evaluator_results` | Evaluator-specific scores and explanations |
| `traces` / `spans` | Hierarchical execution diagnostics |
| `model_prices` | Versioned model/provider pricing records |
| `usage_records` | Raw token and modality usage attribution |
| `outbox_events` | Durable events to publish to background workers |
| `prompt_versions` | Versioned prompt templates and settings |
| `chain_versions` | Versioned chain graph and node configuration |
| `synthetic_generation_jobs` | Provenance and lifecycle of generated test data |

The job queue maintains its own job metadata and lifecycle tables. Queue internals are not used as a substitute for domain-level run and result records.

## API reference

The API is organized around resource-oriented endpoints. All request bodies are validated, protected operations require authentication, and resource-level permissions are checked before mutation or execution.

> The paths below show the canonical versioned API surface documented for the complete platform. Route aliases may be retained for compatibility with earlier development endpoints.

### API conventions

- Base path: `/api/v1`
- Content type: `application/json`
- Asynchronous creation: `202 Accepted` with a resource or run identifier.
- Validation errors: `400 Bad Request` with field-level details.
- Missing authentication: `401 Unauthorized`.
- Insufficient permission: `403 Forbidden`.
- Missing resource: `404 Not Found`.
- Rate limit exceeded: `429 Too Many Requests`.
- Unexpected server error: `500 Internal Server Error` with a correlation ID.

### Models

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/models` | List registered models |
| `POST` | `/models` | Register a model |
| `GET` | `/models/:id` | Retrieve model details |
| `PATCH` | `/models/:id` | Update model configuration |
| `DELETE` | `/models/:id` | Remove or archive a model |

### Evaluations and test cases

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/evaluations` | List evaluations |
| `POST` | `/evaluations` | Create an evaluation |
| `GET` | `/evaluations/:id` | Retrieve evaluation details |
| `PATCH` | `/evaluations/:id` | Update evaluation definition |
| `DELETE` | `/evaluations/:id` | Archive or delete an evaluation |
| `GET` | `/evaluations/:id/test-cases` | List evaluation test cases |
| `POST` | `/evaluations/:id/test-cases` | Add a test case |
| `PATCH` | `/test-cases/:id` | Update a test case |
| `DELETE` | `/test-cases/:id` | Remove a test case |

### Evaluation runs

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/evaluations/:id/runs` | Create and enqueue a run |
| `GET` | `/runs/:runId` | Retrieve run status and summary |
| `GET` | `/runs/:runId/results` | List per-test-case results |
| `GET` | `/runs/:runId/results/:resultId` | Retrieve one result and evaluator details |
| `POST` | `/runs/:runId/cancel` | Request run cancellation |
| `GET` | `/runs/:runId/traces` | List traces for the run |
| `GET` | `/runs/:runId/metrics` | Retrieve aggregate run metrics |

### Datasets and synthetic generation

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/datasets` | List datasets |
| `POST` | `/datasets` | Create a dataset |
| `GET` | `/datasets/:id` | Retrieve dataset metadata |
| `POST` | `/datasets/:id/test-cases/import` | Import test cases |
| `GET` | `/datasets/:id/versions` | List immutable dataset versions |
| `GET` | `/datasets/:id/versions/:versionId` | Retrieve a dataset snapshot |
| `POST` | `/datasets/:id/generations` | Start synthetic generation |
| `GET` | `/generations/:generationId` | Retrieve generation status and quality report |

### Pricing and usage

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/pricing/models/:modelId` | Retrieve active pricing |
| `PUT` | `/pricing/models/:modelId` | Create or update a pricing version |
| `GET` | `/runs/:runId/usage` | Retrieve token usage and cost breakdown |
| `GET` | `/analytics/costs` | Query cost aggregates |
| `GET` | `/analytics/models` | Compare model quality, latency, and cost |

### Prompts, chains, and experiments

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/prompts` | Create a prompt definition |
| `POST` | `/prompts/:id/versions` | Create a prompt version |
| `GET` | `/prompts/:id/versions` | List prompt versions |
| `POST` | `/chains` | Create a chain definition |
| `POST` | `/chains/:id/versions` | Create a chain version |
| `POST` | `/experiments/compare` | Compare two or more run snapshots |
| `GET` | `/experiments/:id` | Retrieve comparison report |

### Health and runtime

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/health` | Liveness check |
| `GET` | `/ready` | Readiness check including required dependencies |
| `GET` | `/metrics` | Runtime metrics for the configured metrics collector |

### Example: create an evaluation run

```bash
curl -X POST "http://localhost:3000/api/v1/evaluations/EVALUATION_ID/runs" \
  -H "Authorization: Bearer $AI_EVAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "modelId": "MODEL_ID",
    "datasetVersionId": "DATASET_VERSION_ID",
    "options": {
      "maxConcurrency": 5,
      "timeoutMs": 60000,
      "maxRetries": 2
    }
  }'
```

Example response:

```json
{
  "runId": "RUN_ID",
  "evaluationId": "EVALUATION_ID",
  "status": "queued",
  "createdAt": "2026-11-14T12:00:00.000Z"
}
```

### Example: retrieve a run

```bash
curl "http://localhost:3000/api/v1/runs/RUN_ID" \
  -H "Authorization: Bearer $AI_EVAL_API_KEY"
```

Example response:

```json
{
  "id": "RUN_ID",
  "status": "running",
  "progress": {
    "total": 100,
    "queued": 42,
    "running": 5,
    "completed": 51,
    "failed": 2
  },
  "metrics": {
    "passRate": null,
    "averageLatencyMs": 1840,
    "totalTokens": 126400,
    "totalCost": 0.42,
    "currency": "USD"
  }
}
```

The values above are illustrative response examples; actual identifiers, counts, and costs are generated by the corresponding run.

## Project structure

The codebase follows a modular TypeScript layout with explicit boundaries between transport, application logic, persistence, and background execution.

```text
ai-eval-ts/
├── src/
│   ├── app.ts
│   ├── index.ts
│   ├── config/
│   │   ├── database.ts
│   │   ├── pgboss.ts
│   │   └── environment.ts
│   ├── routes/
│   │   ├── models.routes.ts
│   │   ├── evaluations.routes.ts
│   │   ├── runs.routes.ts
│   │   ├── datasets.routes.ts
│   │   ├── pricing.routes.ts
│   │   └── health.routes.ts
│   ├── controllers/
│   │   ├── models.controller.ts
│   │   ├── evaluations.controller.ts
│   │   ├── runs.controller.ts
│   │   ├── datasets.controller.ts
│   │   └── pricing.controller.ts
│   ├── services/
│   │   ├── models.service.ts
│   │   ├── evaluations.service.ts
│   │   ├── runs.service.ts
│   │   ├── datasets.service.ts
│   │   ├── pricing.service.ts
│   │   ├── experiment.service.ts
│   │   └── synthetic-generation.service.ts
│   ├── repositories/
│   │   ├── models.repository.ts
│   │   ├── evaluations.repository.ts
│   │   ├── runs.repository.ts
│   │   ├── results.repository.ts
│   │   ├── datasets.repository.ts
│   │   ├── outbox.repository.ts
│   │   └── pricing.repository.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── authorization.middleware.ts
│   │   ├── rate-limit.middleware.ts
│   │   ├── validation.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── request-context.middleware.ts
│   ├── schemas/
│   │   ├── model.schema.ts
│   │   ├── evaluation.schema.ts
│   │   ├── run.schema.ts
│   │   ├── test-case.schema.ts
│   │   └── dataset.schema.ts
│   ├── queue/
│   │   ├── outbox.publisher.ts
│   │   ├── jobs.ts
│   │   ├── workers/
│   │   │   ├── evaluation.worker.ts
│   │   │   ├── test-case.worker.ts
│   │   │   └── generation.worker.ts
│   │   └── handlers/
│   │       ├── evaluation.handler.ts
│   │       ├── test-case.handler.ts
│   │       └── generation.handler.ts
│   ├── engine/
│   │   ├── evaluation-orchestrator.ts
│   │   ├── task-scheduler.ts
│   │   ├── concurrency.ts
│   │   ├── run-aggregator.ts
│   │   └── cancellation.ts
│   ├── providers/
│   │   ├── provider.interface.ts
│   │   ├── provider.registry.ts
│   │   ├── openai-compatible.provider.ts
│   │   └── adapters/
│   ├── evaluators/
│   │   ├── evaluator.interface.ts
│   │   ├── evaluator.registry.ts
│   │   ├── exact-match.evaluator.ts
│   │   ├── schema.evaluator.ts
│   │   ├── semantic.evaluator.ts
│   │   ├── llm-judge.evaluator.ts
│   │   └── trajectory.evaluator.ts
│   ├── agents/
│   │   ├── agent-runtime.ts
│   │   ├── tool-registry.ts
│   │   ├── trajectory.ts
│   │   └── budget-manager.ts
│   ├── chains/
│   │   ├── chain-runtime.ts
│   │   ├── chain-validator.ts
│   │   └── node-registry.ts
│   ├── pricing/
│   │   ├── token-meter.ts
│   │   ├── cost-calculator.ts
│   │   └── pricing-resolver.ts
│   ├── tracing/
│   │   ├── trace-context.ts
│   │   ├── span-recorder.ts
│   │   └── telemetry.ts
│   ├── chaos/
│   │   ├── fault-profile.ts
│   │   ├── fault-injector.ts
│   │   └── resilience-runner.ts
│   ├── errors/
│   │   ├── application.error.ts
│   │   ├── provider-request.error.ts
│   │   └── queue.error.ts
│   └── utils/
│       ├── ids.ts
│       ├── retry.ts
│       └── time.ts
├── migrations/
├── scripts/
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── contract/
│   └── e2e/
├── docs/
│   ├── architecture/
│   ├── api/
│   └── runbooks/
├── .env.example
├── docker-compose.yml
├── package.json
├── pnpm-lock.yaml
└── tsconfig.json
```

The tree is a logical module map. Individual files can be split or consolidated as the implementation evolves, while preserving the dependency boundaries.

## Local development

AI Eval TS is designed to run locally without requiring a managed cloud service. The application uses Node.js and PostgreSQL; the queue is backed by PostgreSQL through `pg-boss`.

### Prerequisites

- Node.js 24 or a compatible supported LTS release.
- pnpm.
- PostgreSQL 16+ (or the PostgreSQL version pinned by the project).
- Docker Engine and Docker Compose are optional but convenient for running PostgreSQL locally.
- Provider credentials for whichever inference provider is being tested.

### 1. Clone and install

```bash
git clone <your-repository-url> ai-eval-ts
cd ai-eval-ts
pnpm install
```

### 2. Configure environment

Create a local environment file:

```bash
cp .env.example .env
```

Set the database connection, API port, authentication settings, and provider credentials. Do not commit `.env` or real credentials.

### 3. Start PostgreSQL

Use the project's Compose configuration or a local PostgreSQL instance. For a local container, an example is:

```bash
docker run --name ai-eval-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ai_eval_db \
  -p 5433:5432 \
  -d postgres:16-alpine
```

The host connection string for this example is:

```text
postgresql://postgres:postgres@localhost:5433/ai_eval_db
```

Use a non-default password outside an isolated local development environment.

### 4. Apply migrations

```bash
pnpm db:migrate
```

If the repository uses a different migration command, use the command defined in `package.json`.

### 5. Start the API

```bash
pnpm dev
```

The API process initializes the application, connects to PostgreSQL, registers middleware and routes, and exposes the configured HTTP port.

### 6. Start background workers

Run the worker process separately where the project exposes a dedicated worker command:

```bash
pnpm worker:dev
```

The worker process initializes the queue connection, registers job handlers, starts the outbox publisher, and begins consuming evaluation and generation jobs.

### 7. Verify health

```bash
curl http://localhost:3000/health
curl http://localhost:3000/ready
```

The liveness endpoint indicates that the process is alive. The readiness endpoint verifies that the dependencies required to accept work are available.

## Configuration

The following table documents the main configuration categories. Exact environment variable names should match `.env.example` in the repository.

| Variable | Purpose | Example |
|---|---|---|
| `NODE_ENV` | Runtime environment | `development` |
| `PORT` | HTTP listening port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5433/ai_eval_db` |
| `PG_BOSS_SCHEMA` | Queue schema name when customized | `pgboss` |
| `WORKER_CONCURRENCY` | Maximum active jobs per worker process | `5` |
| `OUTBOX_POLL_INTERVAL_MS` | Outbox publisher polling interval | `2000` |
| `DEFAULT_JOB_RETRY_LIMIT` | Default queue retry limit | `3` |
| `DEFAULT_REQUEST_TIMEOUT_MS` | Default provider timeout | `60000` |
| `API_RATE_LIMIT_WINDOW_MS` | API rate-limit window | `60000` |
| `API_RATE_LIMIT_MAX` | Requests allowed per window | `100` |
| `TOKEN_BUDGET_DEFAULT` | Default task token budget | `50000` |
| `COST_BUDGET_DEFAULT` | Default task cost budget | `5.00` |
| `LOG_LEVEL` | Structured logging verbosity | `info` |
| `OPENAI_API_KEY` | Provider credential, when used | `***` |
| `OPENAI_BASE_URL` | Optional OpenAI-compatible endpoint | `http://localhost:8000/v1` |
| `AI_EVAL_API_KEY_SECRET` | Secret used by the configured API-key mechanism | `***` |

Only configure credentials for providers in use. Secrets must be supplied through a secure environment or secret manager in deployed environments.

## Running the platform

### Typical development workflow

1. Start PostgreSQL.
2. Apply database migrations.
3. Start the API process.
4. Start one or more worker processes.
5. Register a model.
6. Create or import a dataset and publish a dataset version.
7. Create an evaluation referencing the model, dataset, and evaluator configuration.
8. Create an evaluation run.
9. Follow the run state and inspect per-case results and traces.
10. Compare the run with a baseline and review score, latency, and cost deltas.

### Scaling workers

The API and worker processes are independent. Additional worker processes can be started to increase processing capacity, subject to the global, per-provider, and per-run concurrency limits. Increasing worker count does not bypass rate limits or task budgets.

### Operational separation

For production, run the API and worker processes as separate services. The API handles interactive requests and resource management; workers handle long-running evaluation, generation, and aggregation work. The outbox publisher can run with the worker service or as a dedicated process, provided only one active publisher claims each outbox item at a time.

## Testing

Testing covers application logic, database behavior, provider contracts, queue semantics, and end-to-end run execution.

### Test layers

| Layer | Scope | Examples |
|---|---|---|
| Unit | Isolated logic | Cost calculations, schema validation, score aggregation, retry classification |
| Service | Application behavior | Run creation, permission checks, dataset version selection |
| Repository | SQL and persistence | Transactions, filtering, status transitions, idempotent writes |
| Integration | Multiple components | Outbox-to-queue publishing, worker-to-provider execution, result aggregation |
| Contract | External boundaries | Provider request/response normalization, API payload compatibility |
| End-to-end | Full user workflows | Create evaluation, enqueue run, execute tasks, inspect results |
| Load | Throughput and saturation | Worker concurrency, queue backlog, rate limits, large datasets |
| Chaos | Fault tolerance | Provider failures, worker restarts, duplicate delivery, database interruption |

### Critical invariants to test

- Invalid requests never create partial evaluation records.
- Run creation and outbox event insertion commit or roll back together.
- An unpublished outbox event is eventually retried after publisher failure.
- A duplicate queue delivery does not create a duplicate logical result.
- Distinct test-case jobs from one run can execute concurrently within configured limits.
- Global and provider-specific concurrency limits are never exceeded.
- Retryable errors are retried within the configured limit; permanent errors are not retried indefinitely.
- Failed task execution still releases acquired concurrency capacity.
- Every terminal test-case task is reflected in run aggregation.
- A run cannot be marked completed while expected tasks remain non-terminal.
- Token usage and price-version metadata are retained with the cost calculation.
- Dataset and prompt snapshots used by a run remain immutable.
- Cancellation prevents new work from being scheduled and handles active work according to the configured policy.
- Graceful shutdown stops new work and drains or safely releases active jobs.

### Useful test commands

```bash
pnpm test
pnpm test:unit
pnpm test:integration
pnpm test:e2e
pnpm test:coverage
```

The exact script names are defined by `package.json`.

## Production operations

### Graceful shutdown

The API and worker processes handle termination signals by stopping new work, allowing active operations to finish within a bounded grace period, closing queue connections, and closing database pools. If a worker cannot finish a job before the deadline, the job is left in a recoverable state rather than being acknowledged as successful.

### Health checks

- **Liveness:** process event loop and HTTP server are alive.
- **Readiness:** database and queue dependencies required for the service role are available.
- **Worker health:** queue polling is active, jobs are being acknowledged, and no unrecoverable initialization error has occurred.

### Database operations

- Apply migrations in a controlled deployment step.
- Back up PostgreSQL and periodically verify restore procedures.
- Monitor connection pool saturation, slow queries, and table/index growth.
- Retain run, trace, and raw output data according to an explicit retention policy.
- Avoid deleting domain records that are still referenced by reproducibility or audit records.

### Queue operations

- Monitor queue depth and the age of the oldest pending job.
- Alert on growing retry counts and terminal failures.
- Inspect stuck or repeatedly failing jobs before manual replay.
- Preserve idempotency when replaying jobs.
- Do not mark outbox events published before successful queue publication.

### Cost controls

- Set model, run, and agent-level token/cost budgets.
- Use maximum output-token and timeout settings.
- Track failed-attempt and retry costs.
- Review judge-model and synthetic-generation spend separately.
- Alert on unexpected cost spikes or pricing records that have expired.

## Design principles

1. **Reproducibility:** every run references immutable evaluation inputs and configuration versions.
2. **Durability:** accepted work is persisted before asynchronous execution begins.
3. **Idempotency:** retries and duplicate deliveries do not duplicate logical results.
4. **Bounded execution:** concurrency, rate, time, token, step, and cost limits are explicit.
5. **Separation of concerns:** routes, controllers, services, repositories, workers, providers, and evaluators have distinct responsibilities.
6. **Provider neutrality:** model-specific behavior is isolated behind adapters.
7. **Explainable scoring:** aggregate metrics retain links to per-case evaluator results and traces.
8. **Cost awareness:** token usage and price versions are recorded alongside quality measurements.
9. **Observable execution:** model calls, chain nodes, tool calls, retries, and failures are traceable.
10. **Composable evaluation:** deterministic, semantic, judge-based, chain, and agent evaluators share a common execution model.
11. **Safe failure handling:** errors are classified, retries are bounded, and partial results are retained.
12. **Local-first development:** the core platform can be developed and exercised without depending on a managed cloud runtime.

## Glossary

| Term | Meaning |
|---|---|
| Agent trajectory | Ordered sequence of observations, actions, tool calls, and outcomes during an agent task |
| Bounded concurrency | Explicit cap on the number of simultaneously active tasks |
| Chain | Multi-step graph of model calls, retrieval, tools, transformations, and routing logic |
| Dataset version | Immutable snapshot of test cases used by a run |
| Evaluator | Component that scores an output, result, or execution trace |
| LLM-as-a-judge | Model-based evaluator that scores outputs against a rubric |
| Outbox | Durable event record written in the same transaction as the business state change |
| Provider adapter | Integration translating normalized model requests to provider-specific APIs |
| Run | Immutable execution of an evaluation against a model and configuration snapshot |
| Span | Timed operation within a trace |
| Synthetic task | Generated evaluation scenario with defined constraints and verifiable success criteria |
| Token pricing | Versioned rates used to convert recorded token usage into estimated inference cost |
| Trace | Hierarchical record of an evaluation, test case, chain, or agent execution |

---

## License

Add the license used by this repository before publishing or distributing the project.
