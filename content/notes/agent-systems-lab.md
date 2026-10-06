I wanted to play with multi-agent systems, learn how to keep them understandable and under control, so I’ve started [a playground](https://github.com/saski/agent-systems-lab)

All the frequent conversations I'm having around agentic systems lately took me back to Donella Meadows’ "Thinking in Systems", so I'll use the playground for exploring her ideas about feedback loops, delays, bottlenecks and the effects of local decisions on the wider system.

The goal is to build a practical space for testing tools, questioning design choices and learning from the system’s behaviour, having that information at hand.

The initial setup combines LangGraph orchestration, containerized specialist agents, scoped permissions, an audit trail and OpenTelemetry. A live dashboard makes it easier to follow tasks, inspect their progress and see where human review is needed. Take a look at [the experiments](https://github.com/saski/agent-systems-lab/tree/main/experiments)
