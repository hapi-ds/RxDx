# RxDx Schedule Management User Guide

## Table of Contents

1. [Introduction](#introduction)
2. [Sprint Planning Workflow](#sprint-planning-workflow)
3. [Backlog Management](#backlog-management)
4. [Gantt Chart Usage](#gantt-chart-usage)
5. [Velocity Tracking](#velocity-tracking)
6. [Critical Path Interpretation](#critical-path-interpretation)
7. [Best Practices](#best-practices)

---

## Introduction

RxDx provides comprehensive project scheduling and management capabilities including:

- **Automated Scheduling**: Constraint-based scheduling using OR-Tools
- **Sprint Management**: Plan and track sprints with velocity tracking
- **Backlog Management**: Organize and prioritize work items
- **Gantt Chart Visualization**: Visual timeline of project tasks
- **Critical Path Analysis**: Identify tasks that impact project completion
- **Resource Allocation**: Skills-based resource matching and assignment
- **Progress Tracking**: Monitor actual vs. planned progress

This guide will walk you through the key workflows and features of the RxDx scheduling system.

---

## Sprint Planning Workflow

### Overview

Sprints are time-boxed iterations (typically 1-4 weeks) where teams commit to completing a set of tasks. RxDx provides tools to plan, execute, and track sprints effectively.

### Step 1: Create a Sprint

1. Navigate to the **Sprints** page for your project
2. Click **Create Sprint**
3. Fill in the sprint details:
   - **Name**: e.g., "Sprint 1", "Q1 Sprint 3"
   - **Goal**: Brief description of what the sprint aims to achieve
   - **Start Date**: When the sprint begins
   - **End Date**: When the sprint ends (max 30 days)
4. Click **Create**

**Example**:
```
Name: Sprint 1
Goal: Implement user authentication and basic dashboard
Start Date: 2024-01-01
End Date: 2024-01-14 (2 weeks)
```

The system automatically calculates sprint capacity based on:
- Team members allocated to the project
- Resource availability (hours per day)
- Sprint duration
- Historical velocity (if available)

### Step 2: Populate the Sprint from Backlog

1. Open the sprint detail view
2. Click **Add Tasks from Backlog**
3. Select tasks from the prioritized backlog
4. Drag and drop tasks into the sprint, or click **Add to Sprint**
5. Monitor the capacity indicator to avoid overcommitment

**Capacity Indicators**:
- 🟢 Green: < 80% capacity (healthy)
- 🟡 Yellow: 80-100% capacity (at limit)
- 🔴 Red: > 100% capacity (overcommitted)

**Tips**:
- Start with highest priority tasks
- Consider task dependencies
- Leave 20% buffer for unexpected work
- Ensure team has required skills for selected tasks

### Step 3: Start the Sprint

1. Review the sprint plan with the team
2. Ensure all tasks are properly estimated
3. Click **Start Sprint**
4. Status changes from "Planning" to "Active"

**Validation**:
- Only one sprint can be active per project at a time
- Sprint must have at least one task
- All tasks must have estimates (hours or story points)

### Step 4: Track Sprint Progress

During the sprint, monitor progress through:

**Sprint Dashboard**:
- Tasks completed vs. remaining
- Hours/story points burned
- Burndown chart (ideal vs. actual)
- Team velocity trend

**Burndown Chart**:
- **Ideal Line**: Linear decrease from total capacity to zero
- **Actual Line**: Real progress based on task completion
- **Above Ideal**: Behind schedule
- **Below Ideal**: Ahead of schedule

**Daily Updates**:
- Team members update task status (In Progress, Completed)
- System automatically updates burndown
- Progress percentage tracked per task

### Step 5: Complete the Sprint

1. At sprint end, click **Complete Sprint**
2. System calculates actual velocity:
   - **Velocity (Hours)**: Total hours of completed tasks
   - **Velocity (Story Points)**: Total story points completed
3. Incomplete tasks automatically return to backlog
4. Sprint status changes to "Completed"

**Velocity Calculation**:
```
Velocity = Sum of (completed tasks' estimates)
Completion Rate = Completed / Planned
```

**Post-Sprint Actions**:
- Review what went well and what didn't
- Update task estimates based on actual time
- Adjust team capacity for next sprint
- Use velocity data for future planning

### Sprint Planning Best Practices

1. **Consistent Duration**: Use same sprint length (e.g., 2 weeks) for predictable velocity
2. **Team Capacity**: Account for holidays, vacations, meetings (typically 6 hours/day productive time)
3. **Buffer Time**: Reserve 20% for bugs, support, and unexpected work
4. **Clear Goals**: Each sprint should have a clear, achievable goal
5. **Task Sizing**: Break large tasks into smaller ones (< 2 days each)
6. **Dependencies**: Resolve external dependencies before sprint starts
7. **Skills Match**: Ensure team has skills needed for selected tasks

---

## Backlog Management

### Overview

The backlog is a prioritized list of work items waiting to be scheduled into sprints. RxDx provides tools to organize, prioritize, and manage your backlog effectively.

### Creating a Backlog

1. Navigate to **Backlogs** page
2. Click **Create Backlog**
3. Enter backlog name and description
4. Click **Create**

**Example**:
```
Name: Product Backlog
Description: Main backlog for all product features and improvements
```

Most projects have one main backlog, but you can create multiple backlogs for different purposes (e.g., "Technical Debt", "Bug Fixes").

### Adding Tasks to Backlog

Tasks are added to the backlog in two ways:

**Automatic Addition**:
- When a task status changes to "Ready", it's automatically added to the project's backlog
- This ensures all ready work is visible and can be prioritized

**Manual Addition**:
1. Open the backlog
2. Click **Add Task**
3. Search for or select the task
4. Click **Add to Backlog**

**Note**: Tasks cannot be in both a sprint and backlog simultaneously.

### Prioritizing Backlog Tasks

Priority determines the order in which tasks should be worked on:

**Drag and Drop**:
1. Open backlog detail view
2. Drag tasks up or down to reorder
3. Changes save automatically

**Bulk Reorder**:
1. Click **Reorder Tasks**
2. Enter priority numbers for each task
3. Click **Save Order**

**Priority Factors to Consider**:
- Business value
- Customer impact
- Dependencies (prerequisite for other work)
- Risk reduction
- Technical debt
- Effort vs. impact ratio

### Backlog Grooming

Regular backlog grooming (refinement) keeps the backlog healthy:

**Weekly Grooming Session**:
1. Review top 20-30 items
2. Update estimates
3. Clarify requirements
4. Break down large items
5. Remove obsolete items
6. Adjust priorities

**Backlog Health Indicators**:
- ✅ Top 10 items are well-defined and estimated
- ✅ Items are sized appropriately (< 2 days)
- ✅ Dependencies are identified
- ✅ Acceptance criteria are clear
- ✅ No items older than 6 months without review

### Moving Tasks from Backlog to Sprint

1. Open sprint planning view
2. View backlog tasks on the left
3. Drag tasks from backlog to sprint on the right
4. Or click **Add to Sprint** button
5. Task is removed from backlog and added to sprint

**Validation**:
- Task must be in "Ready" status
- Sprint must not be completed
- Sprint capacity must not be exceeded

### Backlog Metrics

**Total Estimated Effort**:
- Sum of all task estimates in backlog
- Helps forecast how many sprints needed

**Backlog Velocity**:
- Rate at which backlog is growing or shrinking
- Backlog Growth = New Items - Completed Items

**Age Distribution**:
- How long items have been in backlog
- Identify stale items that need review

---

## Gantt Chart Usage

### Overview

The Gantt chart provides a visual timeline of your project schedule, showing tasks, dependencies, milestones, and resource assignments.

### Accessing the Gantt Chart

1. Navigate to **Schedule** page
2. Click **View Gantt Chart** button
3. Chart displays all scheduled tasks

### Understanding the Gantt Chart

**Task Bars**:
- **Blue**: Regular tasks
- **Red**: Critical path tasks (impact project completion)
- **Green**: Completed tasks
- **Yellow**: In-progress tasks
- **Gray**: Not started tasks

**Bar Length**: Represents task duration (start to end date)

**Dependencies**:
- **Arrows**: Show task dependencies
- **Finish-to-Start**: Task B starts after Task A finishes
- **Start-to-Start**: Task B starts when Task A starts
- **Finish-to-Finish**: Task B finishes when Task A finishes

**Milestones**:
- **Diamond markers**: Key project milestones
- **Vertical line**: Milestone target date
- **Color**: Green (achieved), Red (missed), Blue (upcoming)

**Sprint Boundaries**:
- **Vertical lines**: Sprint start/end dates
- **Shaded regions**: Sprint duration
- **Labels**: Sprint names

**Resource Assignments**:
- **Icons/Names**: Resources assigned to each task
- **Percentage**: Allocation percentage (e.g., 50% = half-time)

### Navigating the Gantt Chart

**Zoom**:
- **Ctrl + Scroll**: Zoom in/out on timeline
- **Zoom Buttons**: Day, Week, Month, Quarter views

**Pan**:
- **Shift + Drag**: Pan horizontally across timeline
- **Scroll**: Pan vertically through tasks

**Tooltip**:
- **Hover**: View task details (title, dates, duration, assignees, progress)

**Filtering**:
- **By Status**: Show only active, completed, or delayed tasks
- **By Resource**: Show tasks for specific team members
- **By Sprint**: Show tasks in specific sprint
- **By Critical Path**: Show only critical path tasks

### Date Priority in Gantt Chart

RxDx uses a date priority system:

1. **Manual Dates** (highest priority):
   - `start_date`: User-specified start date
   - `due_date`: User-specified deadline
   - Displayed as solid bars

2. **Calculated Dates** (automatic):
   - `calculated_start_date`: Computed by scheduler
   - `calculated_end_date`: Computed by scheduler
   - Displayed as dashed bars when different from manual dates

**Visual Indicators**:
- **Solid bar**: Using manual dates
- **Dashed bar**: Using calculated dates
- **Both visible**: Shows variance between manual and calculated

**Progress Tracking**:
- **Green fill**: Completed percentage
- **Variance indicator**: Actual vs. planned start date
- **Delayed flag**: Task started later than planned

### Using the Gantt Chart for Planning

**Identify Bottlenecks**:
- Look for tasks with many dependencies
- Check resource over-allocation (multiple tasks same time)
- Review critical path for optimization opportunities

**Adjust Schedule**:
- Drag task bars to change dates (updates manual dates)
- Adjust dependencies by clicking and dragging arrows
- Reassign resources by clicking task and selecting new assignee

**What-If Analysis**:
- Temporarily adjust dates to see impact
- Check critical path changes
- Evaluate resource leveling options

**Export**:
- **PDF**: Print-friendly Gantt chart
- **PNG**: Image for presentations
- **CSV**: Task data for external analysis

---

## Velocity Tracking

### Overview

Velocity measures how much work a team completes in a sprint. Tracking velocity helps predict future capacity and improve planning accuracy.

### Velocity Metrics

**Velocity (Hours)**:
- Total hours of completed tasks in a sprint
- Example: Sprint 1 completed 280 hours of work

**Velocity (Story Points)**:
- Total story points of completed tasks in a sprint
- Example: Sprint 1 completed 35 story points

**Completion Rate**:
- Percentage of planned work completed
- Formula: `Completed / Planned * 100`
- Example: 280 / 320 = 87.5% completion rate

### Viewing Velocity

**Sprint Velocity**:
1. Open sprint detail view
2. Click **Velocity** tab
3. View metrics:
   - Planned vs. Actual hours
   - Planned vs. Actual story points
   - Completion rate
   - Velocity trend

**Project Velocity**:
1. Navigate to **Project Dashboard**
2. Click **Velocity** section
3. View:
   - Average velocity (last 3 sprints)
   - Velocity history chart
   - Trend (increasing, stable, decreasing)

**Velocity History**:
- Chart showing velocity over time
- Helps identify patterns and trends
- Useful for capacity planning

### Using Velocity for Planning

**Sprint Capacity Estimation**:
```
Next Sprint Capacity = Average Velocity * Team Availability
```

**Example**:
- Average velocity: 280 hours
- Team availability: 90% (one person on vacation)
- Next sprint capacity: 280 * 0.9 = 252 hours

**Release Planning**:
```
Sprints Needed = Total Backlog Effort / Average Velocity
```

**Example**:
- Backlog: 1,400 hours
- Average velocity: 280 hours/sprint
- Sprints needed: 1,400 / 280 = 5 sprints

**Confidence Intervals**:
- Use velocity range (min, avg, max) for estimates
- Example: 250-280-310 hours per sprint
- Provides optimistic, realistic, pessimistic scenarios

### Improving Velocity

**Factors That Increase Velocity**:
- Team stability (same members)
- Clear requirements
- Minimal context switching
- Effective collaboration
- Automated testing
- Reduced technical debt

**Factors That Decrease Velocity**:
- Team changes (new members)
- Unclear requirements
- External dependencies
- Technical debt
- Meetings and interruptions
- Production issues

**Velocity Improvement Actions**:
1. **Reduce Waste**: Minimize meetings, context switching
2. **Improve Quality**: Invest in testing, code reviews
3. **Clear Blockers**: Resolve dependencies early
4. **Team Development**: Training, pair programming
5. **Process Optimization**: Retrospectives, continuous improvement

**Warning**: Don't use velocity to compare teams or pressure for higher numbers. Velocity is a planning tool, not a performance metric.

---

## Critical Path Interpretation

### Overview

The critical path is the sequence of tasks that determines the minimum project duration. Any delay in critical path tasks delays the entire project.

### Understanding Critical Path

**Critical Path Tasks**:
- Tasks that, if delayed, delay the project
- Have zero slack/float time
- Form a continuous chain from start to finish

**Non-Critical Tasks**:
- Have slack time (can be delayed without impacting project)
- Can be rescheduled for resource leveling
- Provide flexibility in scheduling

**Critical Path Calculation**:
1. Build dependency graph
2. Calculate earliest start/finish for each task (forward pass)
3. Calculate latest start/finish for each task (backward pass)
4. Identify tasks where earliest = latest (zero slack)

### Viewing Critical Path

**In Gantt Chart**:
- Critical path tasks highlighted in red
- Non-critical tasks in blue
- Hover to see slack time

**In Task List**:
- Filter by "Critical Path" to show only critical tasks
- Sort by slack time (ascending)
- Critical tasks have `is_critical: true` flag

**Critical Path Report**:
1. Navigate to **Schedule** page
2. Click **Critical Path Analysis**
3. View:
   - List of critical path tasks
   - Total critical path duration
   - Project completion date
   - Risk factors

### Using Critical Path for Project Management

**Focus Attention**:
- Monitor critical path tasks closely
- Ensure critical tasks have resources
- Remove blockers for critical tasks immediately
- Review critical task estimates carefully

**Risk Management**:
- Critical path tasks are highest risk
- Add buffer time to critical tasks
- Have contingency plans for critical tasks
- Consider parallel work to shorten critical path

**Resource Allocation**:
- Assign best resources to critical tasks
- Prioritize critical tasks over non-critical
- Can delay non-critical tasks to free resources for critical path

**Schedule Compression**:

**Fast Tracking** (parallel work):
- Identify tasks that can overlap
- Example: Start testing while development continues
- Risk: Rework if earlier tasks change

**Crashing** (add resources):
- Add resources to critical path tasks
- Example: Assign 2 developers instead of 1
- Cost: Higher resource costs

**Scope Reduction**:
- Remove non-critical features
- Defer non-critical tasks to later release
- Focus on minimum viable product

### Critical Path Changes

**Dynamic Critical Path**:
- Critical path can change as project progresses
- Task delays may create new critical path
- Task completion may shift critical path

**Monitoring Changes**:
- Review critical path weekly
- Track critical path duration trend
- Alert when critical path extends

**Example Scenario**:
```
Initial Critical Path: A → B → C → D (20 days)
Task E (non-critical) delayed by 5 days
New Critical Path: A → E → F → D (22 days)
```

### Critical Path Best Practices

1. **Identify Early**: Calculate critical path during planning
2. **Monitor Closely**: Track critical path tasks daily
3. **Communicate**: Ensure team knows which tasks are critical
4. **Buffer Time**: Add contingency to critical path
5. **Dependencies**: Minimize dependencies to reduce critical path length
6. **Parallel Work**: Look for opportunities to parallelize critical tasks
7. **Resource Priority**: Allocate best resources to critical path

---

## Best Practices

### Sprint Planning

✅ **DO**:
- Use consistent sprint duration (e.g., always 2 weeks)
- Include team in planning (collaborative estimation)
- Leave 20% buffer for unexpected work
- Review velocity trends before committing
- Ensure clear sprint goal
- Break large tasks into smaller ones
- Consider dependencies and risks

❌ **DON'T**:
- Overcommit beyond team capacity
- Change sprint scope mid-sprint
- Skip sprint retrospectives
- Ignore velocity trends
- Plan without team input
- Include tasks without estimates

### Backlog Management

✅ **DO**:
- Groom backlog weekly
- Keep top 10 items well-defined
- Prioritize by value and risk
- Remove stale items (> 6 months)
- Break down large items
- Include acceptance criteria
- Estimate all items

❌ **DON'T**:
- Let backlog grow unbounded
- Keep vague or unclear items
- Prioritize by who asks loudest
- Ignore technical debt
- Skip estimation
- Add items without review

### Gantt Chart Usage

✅ **DO**:
- Update progress regularly (weekly minimum)
- Review critical path weekly
- Check for resource conflicts
- Use for stakeholder communication
- Export for presentations
- Filter to focus on relevant tasks

❌ **DON'T**:
- Micromanage with daily Gantt updates
- Ignore critical path warnings
- Over-allocate resources
- Create unrealistic schedules
- Skip dependency validation

### Velocity Tracking

✅ **DO**:
- Track both hours and story points
- Use 3-sprint average for planning
- Consider team changes in estimates
- Review velocity trends in retrospectives
- Use for capacity planning
- Account for holidays and vacations

❌ **DON'T**:
- Compare velocity across teams
- Pressure team to increase velocity
- Ignore velocity decreases
- Use velocity as performance metric
- Plan based on best-case velocity
- Forget to adjust for team changes

### Critical Path Management

✅ **DO**:
- Identify critical path early
- Monitor critical tasks daily
- Allocate best resources to critical path
- Add buffer to critical tasks
- Communicate critical path to team
- Have contingency plans
- Review critical path weekly

❌ **DON'T**:
- Ignore critical path
- Delay critical tasks
- Under-resource critical path
- Skip critical path analysis
- Assume critical path won't change

### General Scheduling

✅ **DO**:
- Update task status regularly
- Communicate delays immediately
- Review dependencies before starting
- Match skills to task requirements
- Track actual vs. estimated time
- Learn from past sprints
- Involve team in planning

❌ **DON'T**:
- Set unrealistic deadlines
- Ignore resource constraints
- Skip risk assessment
- Forget to update progress
- Plan without team input
- Ignore historical data

---

## Troubleshooting

### Common Issues

**Issue**: Sprint capacity shows 0 hours
- **Cause**: No resources allocated to project
- **Solution**: Allocate team members to project with availability percentages

**Issue**: Tasks not appearing in backlog
- **Cause**: Task status not set to "Ready"
- **Solution**: Update task status to "Ready" to trigger automatic backlog addition

**Issue**: Cannot start sprint
- **Cause**: Another sprint is already active
- **Solution**: Complete or cancel the active sprint first

**Issue**: Critical path not showing
- **Cause**: No task dependencies defined
- **Solution**: Add BEFORE relationships between tasks to create dependency chain

**Issue**: Burndown chart not updating
- **Cause**: Task completion not recorded
- **Solution**: Update task status to "Completed" and set completion date

**Issue**: Velocity is 0 after sprint completion
- **Cause**: No tasks marked as completed
- **Solution**: Ensure tasks have "Completed" status before completing sprint

---

## Getting Help

For additional support:

- **Documentation**: `/docs` - API documentation
- **Support**: Contact your system administrator
- **Training**: Schedule training session with RxDx team
- **Community**: Join RxDx user community forum

---

## Appendix: Keyboard Shortcuts

### Gantt Chart
- `Ctrl + Scroll`: Zoom in/out
- `Shift + Drag`: Pan timeline
- `Ctrl + F`: Find task
- `Ctrl + P`: Print/Export

### Sprint Board
- `N`: New sprint
- `S`: Start sprint
- `C`: Complete sprint
- `A`: Add task to sprint

### Backlog
- `N`: New backlog item
- `P`: Change priority
- `D`: Delete item
- `E`: Edit item

---

*Last Updated: 2024-01-15*
*Version: 1.0*