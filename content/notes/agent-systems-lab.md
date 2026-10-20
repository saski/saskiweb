<p class="note-soundtrack">
  <a href="https://open.spotify.com/track/2qP8szx9DBDGeiopBwIDIf?utm_source=openai&amp;utm_medium=chatgpt&amp;go=1&amp;nap_web=1&amp;request_id=7c9371f5-c087-4c28-bead-392fadf54b74">
    <img src="https://i.scdn.co/image/ab67616d00004851911190f9736b56741eda4982" width="32" height="32" alt="Songs For Drella album cover" decoding="async">
    <span><span class="soundtrack-label">Soundtrack · Spotify</span><span class="soundtrack-track">Faces and Names · Lou Reed &amp; John Cale</span><span class="soundtrack-album">Songs For Drella</span></span>
  </a>
</p>

The conversations I’ve been having about agentic systems took me back to Donella Meadows’ *Thinking in Systems*. I wanted to explore one of those questions about feedback loops, delays and bottlenecks: what happens when we can execute more work, but our capacity to review it stays the same?

To try it, I used a small, deterministic model in [Agent Systems Lab](https://github.com/saski/agent-systems-lab). It lets me change one rule at a time and keep track of every task that is still waiting.

## What I put in the model

The model follows tasks through execution and review. A task can wait before it starts executing, then wait again once it is ready for review. I count both queues, along with the tasks executing, being reviewed and already decided.

The reviewer is a simulated resource. It is separate from the playground’s Reviewer agent: this experiment does not run the Researcher, Builder or Reviewer agents, call a model provider, or involve a human reviewer. Time advances in logical ticks, with no measured conversion to seconds.

The [checked-in scenario](https://github.com/saski/agent-systems-lab/blob/8bf1669a68a9072326d35abfb18ee979a3766531/experiments/review-capacity/scenario.json) has 24 tasks arriving every two ticks, from tick 0 to tick 46. Each takes eight ticks to execute and six to review. There is one reviewer, and every review accepts.

I kept that workload fixed and compared three versions:

- A has one execution slot and no work-in-progress limit.
- B has four execution slots and no work-in-progress limit.
- C has the same four slots, but at most three tasks can be between starting execution and receiving a decision.

That work-in-progress (WIP) limit includes tasks executing, waiting for review and being reviewed. Each decision frees a place for another task to start. Tasks waiting to start are outside the limit, but I still count them as unfinished. Otherwise, I could make the system look better just by leaving some of its waiting out of the report.

Moving from A to B changes execution capacity. Moving from B to C changes only the admission limit, which controls when a task can start. The arrivals and the time each task needs for execution and review stay the same.

## Where the tasks are waiting

I first looked at tick 60, after processing all the transitions at that tick:

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

With four execution slots, B has completed eight decisions. With one slot, A has completed six. That is four times the execution capacity and 8/6, or about 1.33 times, as many decisions during this window. B has also built up a queue of 15 tasks waiting for review.

The reviewer has stayed the same while more work has become ready for it. The exact ratio depends on startup and on where I stop to look, so I wouldn’t use 1.33 as a rule for how agent systems scale.

C has completed the same eight decisions as B, with only one task waiting for review. But 13 tasks are now waiting to start. Both versions still have 16 unfinished tasks.

The cap changes where the waiting happens; demand and review capacity stay the same. I also followed all 24 tasks through to their final decision to check whether the result was just an effect of stopping at tick 60:

<div class="table-wrap" role="region" aria-label="Results for all 24 tasks through full drain" tabindex="0">

| Full workload, logical ticks | A | B | C |
| --- | ---: | ---: | ---: |
| Final decision | 198 | 152 | 152 |
| End-to-end time, p50 / p95 | 80 / 146 | 58 / 102 | 58 / 102 |
| Admission wait, p50 / p95 | 66 / 132 | 0 / 0 | 40 / 84 |
| Review-queue wait, p50 / p95 | 0 / 0 | 44 / 88 | 4 / 4 |

</div>

Each task receives its decision at the same tick in B as it does in C. C starts less work at once and still keeps the reviewer supplied. The time saved in the review queue is spent waiting before execution instead.

The p50 and p95 values use the nearest-rank method and cover all 24 tasks in each version. At tick 60, only six tasks have finished in A and eight in B and C. Comparing the times of only those completed tasks would mean comparing different groups, so I’ve kept the full-workload timings together.

## Running the experiment

When I prepared this article, I reran the scenario and compared it with the published reference. Both the scenario hash and the deterministic report hash matched. The source links and commands here refer to public revision `8bf1669a68a9072326d35abfb18ee979a3766531`.

You’ll need Git, [uv](https://docs.astral.sh/uv/) and Python 3.11 or newer:

```sh
git clone https://github.com/saski/agent-systems-lab.git
cd agent-systems-lab
git checkout 8bf1669a68a9072326d35abfb18ee979a3766531
make setup
uv run --locked systems-lab experiment review-capacity \
  --scenario experiments/review-capacity/scenario.json
```

The command prints a manifest pointing to a new directory under `.lab/experiments/review-capacity/`. In it, you can inspect `scenario.json`, `report.json` and `manifest.json`. The expected deterministic report SHA-256 is:

```text
a3a9c0396620438fa7c039f5aa9aace98a85cff968ba5004c52e5e25f473e58a
```

You can run this numerical experiment without Docker. The command invokes no model providers or agent workers. The [experiment guide](https://github.com/saski/agent-systems-lab/blob/8bf1669a68a9072326d35abfb18ee979a3766531/experiments/review-capacity/README.md) includes charts, metric definitions and a replay of the saved trace that you can open locally. On GitHub, that HTML guide appears as source; the replay does not run there.

## What I’d measure in a real workflow

I’d measure arrivals, waiting before execution, execution itself, waiting for review and accepted output together. If I only looked at execution speed or the length of the review queue, I would miss some of the time tasks spend in the system.

The WIP limit is something I would test in that workflow. Here it bounds admitted work without slowing down delivery compared with B. Whether that helps in practice depends on things this model leaves out, such as stale context, interruptions, deadlines and work that needs another pass.

The workload here is finite and scheduled, every task takes the same amount of execution and review time, and every review accepts. There is no randomness, rework, fatigue, failure or measure of quality. I can use it to follow what happens to unfinished work when execution capacity grows and review stays fixed. It cannot tell me a real reviewer’s capacity, the best WIP limit, whether agents are safe, or whether a team would become more productive.

The revision used here includes the numerical model and CLI, with a standalone learning guide as documentation. It predates the integrated Experiments dashboard. I’ve since added that view; [Where the waiting goes](https://www.saski.com/notes/review-capacity-replay/) follows the same experiment through its replay and shows the timelines.

You can inspect the [simulation](https://github.com/saski/agent-systems-lab/blob/8bf1669a68a9072326d35abfb18ee979a3766531/src/systems_lab/review_capacity.py) and [metric calculations](https://github.com/saski/agent-systems-lab/blob/8bf1669a68a9072326d35abfb18ee979a3766531/src/systems_lab/review_capacity_metrics.py), or read how I organise the surrounding tools in [Arnesto](/notes/arnesto/).
