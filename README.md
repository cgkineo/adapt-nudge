# adapt-nudge

The goal of this extension is to help users become familiar with the interface of an Adapt course.

**IMPORTANT: This extension is a work in progress.**

# Introduction

To help users become familiar with the interface the extension provides reminders, such as:
- when to scroll, if there is incomplete content on a page
- if there is trickled content yet to be accessed.

In some ways, the extension is trying to interpret user behaviour and preempt things like:
- confusion regarding how to navigate
- mistakes such as forgetting to visit/complete content.

This is quite difficult to achieve and it is important not to over-burden the user with helpful hints. To acknowledge the variability of each Adapt project, the extension is designed to be highly configurable so that the experience can be fine-tuned to the needs of both the client and the content.

# Functionality

The extension functions by setting a timer. With each firing of the timer the extension decides whether to 'nudge' the user: a nudge will typically be a small notification in the corner of the screen that is notable but unobtrusive. The user will not be nudged if there are incomplete, interactive components visible. Visibility is judged by the percentage a component is within the viewport. This value can be configured for the course and also by component if required.

Some components do not require direct user interaction, such as text and graphic components. These components rely on being seen fully by the user to be considered complete. Because of this, these components are not treated in the same way as described for interactive components. That is, when they are the only incomplete components visible, the extension will encourage the user to bring them fully into view by invoking a nudge.

Completing a component signifies that the user is actively engaging with the learning and therefore resets the timer. Naturally, when the user scrolls through the content this action also resets the timer.

# Configuration

When the extension is installed without configuration it is enabled by default. The extension can be configured at the course, page and component level.

The course level configuration options are as follows:

**_nudge** (object): The Nudge attribute group contains values for **_isEnabled**, **_nonInteractiveComponents**, **_visibilityThreshold** and **_wait**.

>**_isEnabled** (boolean): Turns on and off the **Nudge** extension. Can be set in *course.json*, *contentObjects.json* and *components.json* to disable **Nudge** where not required.

>**_nonInteractiveComponents** (object): Used to describe which types of components do not need direct interaction by the user and which rely on being seen (in full) by the user to be considered complete. This attribute group contains values for **_autoAssign** and **_components**.

>>**_autoAssign** (boolean): If set to `true`, the extension will set the property **_isNonInteractive** to `true` on all component types listed in **_components**.

>>**_components** (array): The component types considered non-interactive.

>**_visibilityThreshold** (boolean): The percentage of a component's area that is considered to make a component sufficiently apparent to the user.

>**_wait** (number): The minimum number of milliseconds between each 'nudge'.