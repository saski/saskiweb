Giving agents more execution capacity can make the queue for human review longer without producing much more accepted work. I wanted a small experiment where I could see that happen, count everything still waiting, and change one policy at a time.

In [Agent Systems Lab](https://github.com/saski/agent-systems-lab), four execution slots complete **eight decisions by tick 60**, compared with **six decisions with one slot**. A limit on admitted work makes the review queue much smaller, but the waiting moves upstream. Those are results of a deterministic teaching model, not measurements of a team's productivity.

The conversations I have been having about agentic systems took me back to Donella Meadows' *Thinking in Systems*: feedback loops, delays, bottlenecks, and what happens when a local improvement meets the rest of the system. This experiment is my way of making one of those questions concrete.

## The question and the boundary

What changes when execution gets faster and review capacity stays fixed?

The model has two queues. Tasks wait for admission before execution; after execution, they can wait for review. Admitted work in progress includes tasks executing, waiting for review, or being reviewed. A decision releases a task's WIP allocation.

Admission waiting sits outside the WIP limit but **inside the measurement boundary**. Otherwise, limiting admission could appear to remove work simply by moving it out of view.

The reviewer here is one synthetic resource, separate from the playground's Reviewer agent. This numerical experiment does not invoke the Researcher, Builder or Reviewer agents, a model provider, or an actual human. A tick is a unit of logical time; it has no measured conversion to seconds.

## Hold the workload fixed

The [checked-in scenario](https://github.com/saski/agent-systems-lab/blob/8bf1669a68a9072326d35abfb18ee979a3766531/experiments/review-capacity/scenario.json) schedules **24 tasks**, arriving every **two ticks**, from tick 0 to tick 46. Each task takes **eight execution ticks** and **six review ticks**. There is one reviewer, and every review accepts.

I compare three policies:

- **A:** one execution slot, no WIP limit.
- **B:** four execution slots, no WIP limit.
- **C:** four execution slots, with at most three admitted tasks.

A to B changes execution capacity. B to C changes only the admission limit. All three use the same arrivals and service times.

## Four execution slots do not produce four times the output

At tick 60, including transitions at that tick, the model reports:

<div class="table-wrap" role="region" aria-label="Task locations at tick 60" tabindex="0">

| Tasks at tick 60 | A | B | C |
| --- | ---: | ---: | ---: |
| Decisions completed | 6 | 8 | 8 |
| Total unfinished | 18 | 16 | 16 |
| Waiting for admission | 16 | 0 | 13 |
| Executing | 1 | 0 | 1 |
| Waiting for review | 0 | 15 | 1 |
| Being reviewed | 1 | 1 | 1 |

</div>

Moving from A to B gives a 4× increase in execution slots and an **8/6, or 1.33×, increase in decisions** over this window. Execution helps, but the fixed reviewer cannot keep up with everything arriving from it: B has 15 tasks waiting for review.

This ratio includes startup and the chosen observation window. It is not a scaling law for agents. The useful observation is the mismatch between how quickly work becomes ready and how quickly it can leave review.

## A smaller review queue can hide the same amount of waiting

C completes the same eight decisions as B. Its review queue has just one task, but 13 tasks now wait for admission. Both policies still have **16 unfinished tasks**.

The WIP limit has changed where work waits. It has not removed demand or added review capacity. To see whether this is just an effect of stopping at tick 60, I also follow all 24 tasks until the final decision:

<div class="table-wrap" role="region" aria-label="Results for all 24 tasks through full drain" tabindex="0">

| Full workload, logical ticks | A | B | C |
| --- | ---: | ---: | ---: |
| Final decision | 198 | 152 | 152 |
| End-to-end time, p50 / p95 | 80 / 146 | 58 / 102 | 58 / 102 |
| Admission wait, p50 / p95 | 66 / 132 | 0 / 0 | 40 / 84 |
| Review-queue wait, p50 / p95 | 0 / 0 | 44 / 88 | 4 / 4 |

</div>

Here B and C have identical per-task decision times. C keeps the reviewer supplied while admitting less work. The reduction in review waiting is balanced by waiting before admission.

These percentiles cover the same **24 tasks per policy**, using nearest rank. The tick-60 comparison covers only six completed tasks for A and eight for B and C; comparing latency percentiles for those smaller completed cohorts would answer a different question.

## Reproduce it

For this article I reran the scenario and compared the report with the published reference. The scenario and deterministic report hashes matched. The implementation and source links below refer to public revision `8bf1669a68a9072326d35abfb18ee979a3766531`.

With Git, [uv](https://docs.astral.sh/uv/) and Python 3.11 or newer available:

```sh
git clone https://github.com/saski/agent-systems-lab.git
cd agent-systems-lab
git checkout 8bf1669a68a9072326d35abfb18ee979a3766531
make setup
uv run --locked systems-lab experiment review-capacity \
  --scenario experiments/review-capacity/scenario.json
```

The command prints a manifest pointing to a fresh directory under `.lab/experiments/review-capacity/`. Inspect `scenario.json`, `report.json` and `manifest.json`. The expected deterministic report SHA-256 is:

```text
a3a9c0396620438fa7c039f5aa9aace98a85cff968ba5004c52e5e25f473e58a
```

This command invokes no providers or agent workers. Docker is not needed for the numerical experiment. The [experiment guide](https://github.com/saski/agent-systems-lab/blob/8bf1669a68a9072326d35abfb18ee979a3766531/experiments/review-capacity/README.md) has the charts, metric definitions, and a saved-trace replay you can open locally. GitHub displays that HTML guide as source; it does not run the replay there.

## What I would take into a real workflow

I would measure arrivals, admission waiting, execution, review waiting and accepted output together. A dashboard showing only faster execution or a shrinking review queue can miss the cost elsewhere in the system.

A WIP limit is a policy to test. In this model it bounds admitted work without slowing B's delivery timing. Whether that is useful in practice depends on costs the model does not represent: stale context, interruptions, deadlines and work that needs another pass.

The limitations are deliberate. Arrivals are finite and scheduled, tasks have uniform service times, every review accepts, and there is no randomness, rework, fatigue, failure or quality measure. This experiment cannot establish real reviewer capacity, an optimal WIP limit, agent safety, or productivity gains. It supports a narrower conclusion: **when execution gets faster and review stays fixed, count where all the unfinished work goes**.

The numerical model and CLI are implemented. The standalone learning guide is documentation; the integrated Experiments dashboard remains pending in the public revision used here. You can inspect the [simulation](https://github.com/saski/agent-systems-lab/blob/8bf1669a68a9072326d35abfb18ee979a3766531/src/systems_lab/review_capacity.py) and [metric calculations](https://github.com/saski/agent-systems-lab/blob/8bf1669a68a9072326d35abfb18ee979a3766531/src/systems_lab/review_capacity_metrics.py), or read how I organise the surrounding tools in [Arnesto](/notes/arnesto/).
