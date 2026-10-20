<p class="note-soundtrack">
  <a href="https://open.spotify.com/track/7AR6yRthGwDf1A7VbyyH3v?utm_source=openai&amp;utm_medium=chatgpt&amp;go=1&amp;nap_web=1&amp;request_id=ba4d6e62-4218-41d3-a97a-d024bbd7f26e">
    <img src="https://i.scdn.co/image/ab67616d00004851469a5848dc274b1d51e504a8" width="32" height="32" alt="The Perfect Prescription album cover" decoding="async">
    <span><span class="soundtrack-label">Soundtrack · Spotify</span><span class="soundtrack-track">Take Me to the Other Side · Spacemen 3</span><span class="soundtrack-album">The Perfect Prescription</span></span>
  </a>
</p>

I’ve been working on [Agent Systems Lab](https://github.com/saski/agent-systems-lab), following some of the questions that came out of reading *Thinking in Systems*. It’s a small playground for experimenting with agent workflows. This time, I wanted to look at what happens when execution gets faster while review capacity stays the same.

The [previous experiment](https://www.saski.com/notes/agent-systems-lab/) gave me the numbers. From there, I wanted to follow a task through the system and see where it spent its time waiting. So I added a replay to the local dashboard.

For the simulation, I used 24 tasks and one simulated reviewer. A new task arrives every two ticks. Each takes eight ticks of execution and six ticks of review; these are units of model time, with no measured conversion to seconds.

I tracked each task until the reviewer made a decision on the proposed change. That includes waiting before execution and waiting after the automated work has finished.

I compared three versions:

- A has one execution slot, so one task can execute at a time.
- B has four execution slots, allowing up to four tasks to execute at once.
- C has the same four slots, but at most three tasks can be between starting execution and receiving a decision.

That last rule is the work-in-progress (WIP) limit. Executing tasks, tasks waiting for review and the task being reviewed all use one of those places. A place becomes free when a decision is made. Anything waiting to start stays visible and still counts as unfinished work.

At tick 60, that limit brings the review queue down from 15 tasks in B to one in C. Both have completed eight decisions and still have 16 unfinished tasks. In C, 13 of them are waiting to start; one is executing, one is waiting for review, and one is being reviewed.

<figure>
  <a href="https://www.saski.com/notes/assets/review-capacity-over-time-2026-10-20.svg"><img src="https://www.saski.com/notes/assets/review-capacity-over-time-2026-10-20.svg" width="2160" height="1980" alt="Three time plots compare completed decisions, tasks waiting to start and tasks waiting for review. B and C have identical decision times, while C keeps more waiting before execution." decoding="async"></a>
  <figcaption>B and C finish all 24 tasks at tick 152; A finishes at tick 198. The dotted line marks tick 60. Open the image for the full-size view.</figcaption>
</figure>

Task #11 from the saved trace makes that change easier to follow. It arrives at tick 22 in all three versions. In B, it starts straight away and then waits 44 ticks for review. In C, it waits 40 ticks before execution and four for review. Both receive a decision at tick 80.

<figure>
  <a href="https://www.saski.com/notes/assets/review-capacity-task-11-2026-10-20.svg"><img src="https://www.saski.com/notes/assets/review-capacity-task-11-2026-10-20.svg" width="2160" height="1278" alt="Task 11 timeline: A waits 66 ticks before execution and zero for review; B waits zero before execution and 44 for review; C waits 40 before execution and four for review. Each executes for eight ticks and is reviewed for six." loading="lazy" decoding="async"></a>
  <figcaption>Task #11 receives its decision at tick 102 in A and tick 80 in both B and C. Numbers inside the bars are durations. Open the image for the full-size view.</figcaption>
</figure>

That timing holds for every task in this particular scenario: B and C finish each task at the same tick, with the cap changing how much work has started and where it waits.

The new Experiments view brings the comparison, charts and individual task positions together. Select policy B at tick 60 and you can see the work waiting for review. Switch to C at the same tick and most of that waiting is before execution. You can go backwards through the replay to follow how each task got there, connecting the totals with the individual tasks behind them.

Play/Pause and the speed controls move through the saved trace. They affect how quickly you watch it; execution and review capacity stay the same. The [dashboard guide](https://github.com/saski/agent-systems-lab/blob/0e1a186f5f08c84ba0e9c86b10bc6e04d58827a5/docs/dashboard.md) covers local setup and how to read the different views. The [scenario file](https://github.com/saski/agent-systems-lab/blob/0e1a186f5f08c84ba0e9c86b10bc6e04d58827a5/experiments/review-capacity/scenario.json) contains the inputs used here.

The reviewer in this example accepts every task. There are no mistakes, requests for changes, interruptions or fatigue. A smaller review queue here says nothing about review quality or the productivity of a real team.

The next experiment will test the admission rule with actual fixture workflows: whether a task waiting for a human decision keeps its place, including after a restart. That behavior still needs implementing and testing.
