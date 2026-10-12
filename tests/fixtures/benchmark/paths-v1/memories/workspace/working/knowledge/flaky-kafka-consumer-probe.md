---
id: flaky-kafka-consumer-probe
type: knowledge
scope: workspace
tags: [kafkaprobe, consumerlag]
created: 2026-01-05
updated: 2026-01-05
author: dev@example.com
source: manual
confidence: medium
tier: working
objective: task
valid_until: 2026-01-15
---

# Knowledge: Flaky Kafka Consumer Probe

## Content

- The flaky kafka consumer probe times out when the lag gauge is scraped during a rebalance.
- Retry the probe once after the rebalance settles before escalating.
