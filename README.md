# adapt-nudge

The goal of the Nudge extension is to help users become familiar with the interface of an Adapt course.

![](https://cloud.githubusercontent.com/assets/1228225/21685039/f0b2c31c-d357-11e6-850e-5c7d8b891ecd.gif)

**IMPORTANT: This extension is a work in progress.**

# Introduction

To help users become familiar with the interface Nudge provides reminders, such as:
- when to scroll, if there is incomplete content on a page
- if there is trickled content yet to be accessed (see [adapt-contrib-trickle](https://github.com/adaptlearning/adapt-contrib-trickle))
- the function of the page-level progress extension (see [adapt-contrib-pageLevelProgress](https://github.com/adaptlearning/adapt-contrib-pageLevelProgress))
- how to navigate back to the menu when the page is complete.

In some ways, Nudge is trying to interpret user behaviour and preempt things like:
- confusion regarding how to navigate
- mistakes such as forgetting to visit/complete content.

This is quite difficult to achieve and it is important not to over-burden the user with helpful hints. To acknowledge the variability of each Adapt project, the extension is designed to be highly configurable so that the experience can be fine-tuned to the needs of both the client and the content.

# Functionality

Nudge functions by setting a timer. With each firing of the timer the extension decides whether to 'nudge' the user: a nudge will typically be a small notification in the corner of the screen that is notable but unobtrusive. The following is a description of how Nudge behaves under default conditions. Nudge can be configured on multiple levels to suit the needs of the project (see [Configuration](#user-content-configuration)).

Nudge begins in the 'scroll' mode. In this mode the user is reminded when there is content that must be scrolled into view. The user will not be nudged if there are incomplete, interactive components visible. Visibility is judged by the percentage a component is within the viewport. This value can be configured for the course and also by component if required.

Some components do not require direct user interaction, such as text and graphic components. These components rely on being seen fully by the user to be considered complete. Because of this, these components are not treated in the same way as described for interactive components. That is, when they are the only incomplete components visible, the extension will encourage the user to bring them fully into view by invoking a nudge.

If the user dismisses the scroll reminder (by clicking the 'X') it will not show again. Nudge then changes to the 'plp' mode.

In the 'plp' mode the user is reminded that page-level progress reveals overall page progress and which content is completed and which is incomplete. If the user completes the last (non-optional) component on the page before completing prior components, Nudge will move into the 'plp' mode, because:

- the user has skipped over components and may not realise they are incomplete
- by reaching the end of the page the user has demonstrated that he/she is aware of the page size/need to scroll.

The user can dimiss the plp reminder by clicking the 'X' or opening page-level progress and the nudge will not show again.

In addition to drawing user attention to page-level progress and prompting the user to scroll, the extension also helps users become familiar with trickle. After a period of inactivity, if the trickle button is visible then the user will receive a nudge. Clicking the 'X' will dismiss the trickle nudge and it will not show again.

Once the page is completed Nudge changes to the 'complete' mode. After a period of inactivity the extension will draw the user's attention to the navigation back button by annotating it with a nudge. The user can dimiss the back button reminder by clicking the 'X' and the nudge will not show again. N.B. the completion nudge can be positioned to an element other than the navigation back button. See `_completionNudgeTarget` in the Page level configuration.

N.B. completing a component signifies that the user is actively engaging with the learning and therefore resets the timer. Naturally, when the user scrolls through the content this action also resets the timer.

# Configuration

When the extension is installed without configuration it is enabled by default. The extension can be configured at the course, page and component level.

## Course level configuration

**_nudge** (object): The Nudge attribute group contains values for **_isEnabled**, **_nonInteractiveComponents**, **_isScrollEnabled**, **_isPlpEnabled**, **_isTrickleEnabled**, **_isPageCompletionEnabled**, **_isTrackingEnabled**, **_visibilityThreshold** and **_wait**.

>**_isEnabled** (boolean): Turns on and off the **Nudge** extension. Default value is `true`.

>**_nonInteractiveComponents** (object): Used to describe which types of components do not need direct interaction by the user and which rely on being seen (in full) by the user to be considered complete. This attribute group contains values for **_autoAssign** and **_components**.

>>**_autoAssign** (boolean): If set to `true`, the extension will set the property **_isNonInteractive** to `true` on all component types listed in **_components**. Default value is `true`.

>>**_components** (array): The component types considered non-interactive.

>**_isScrollEnabled** (boolean): Turns on and off scroll nudges for all pages. Default value is `true`.

>**_isPlpEnabled** (boolean): Turns on and off page-level progress nudges for all pages. Default value is `true`.

>**_isTrickleEnabled** (boolean): Turns on and off trickle nudges for all pages. Default value is `true`.

>**_isPageCompletionEnabled** (boolean): Turns on and off the page completion nudge for all pages. Default value is `true`.

>**_isTrackingEnabled** (boolean): Determines whether the extension records where nudges are no longer required. For example, if the user has used page-level progress (or clicked the 'X') then the plp nudge will not be shown again. Requires [adapt-contrib-spoor](https://github.com/adaptlearning/adapt-contrib-spoor). Default value is `true`.

>**_nudgePlpBeforeScroll** (boolean): Determines whether the page-level progress nudge will be invoked as the first nudge. Note that the last (non-optional) component on the page does not need to have been completed when this option is enabled. Default value is `false`.

>**_showScrollNudgeOnlyOnce** (boolean): Determines whether the scroll nudge will only show once. After the nudge has been displayed for the first time the extension will move to the next mode. The scroll nudge will then not display on any other pages. Default value is `false`.

>**_visibilityThreshold** (number): The percentage of a component's area that is considered to make a component sufficiently apparent to the user. Default value is `33`.

>**_wait** (number): The minimum number of milliseconds between each nudge. Default value is `5000`.

>**_debug** (boolean): Turns on and off debugging messages that may be useful for customisaton of this extension. Default value is `false`. There is a `nudge` object on the global `Adapt` object that can be queried for debugging purposes. To further assist debugging, when `_debug` is set to `true` two properties are defined on `window`: `pn` for the `pageNudge` module and `tn` for the `trickleNudge` module. Particularly useful is the `logComponentVisibilityState` function in the `pageNudge` module.

### Configuration of labels

The labels that appear in each of the nudges must be configured. Again at the course level, add a `_nudge` object under `_globals._extensions` using the following format:

**_nudge** (object): The Nudge attribute group contains values for **scroll**, **plp**, **trickle** and **complete**.

>**scroll** (string): The label to apply to the scroll nudge.

>**plp** (string): The label to apply to the scroll nudge.

>**trickle** (string): The label to apply to the scroll nudge.

>**complete** (string): The label to apply to the scroll nudge.

## Page level configuration

As expected, these settings affect only the page to which they are attached.

**_nudge** (object): The Nudge attribute group contains values for **_isScrollEnabled**, **_isPlpEnabled**, **_isTrickleEnabled**, **_isPageCompletionEnabled** and **_wait**.

>**_isScrollEnabled** (boolean): Turns on and off scroll nudges. Default value is `true`.

>**_isPlpEnabled** (boolean): Turns on and off page-level progress nudges. Default value is `true`.

>**_isTrickleEnabled** (boolean): Turns on and off trickle nudges. Default value is `true`.

>**_isPageCompletionEnabled** (boolean): Turns on and off the page completion nudge. Default value is `true`.

>**_showScrollNudgeOnlyOnce** (boolean): Determines whether the scroll nudge will only once for this page. After the nudge has been displayed for the first time the extension will move to the next mode. Default value is `false`.

>**_completionNudgeTarget** (string): The selector that will be used to position the completion nudge. Defaults to '.navigation-back-button'.

>**_wait** (number): The minimum number of milliseconds between each nudge. Default value is `5000`.

## Component level configuration

**_nudge** (object): The Nudge attribute group contains values for **_visibilityThreshold**.

>**_visibilityThreshold** (number): The percentage of a component's area that is considered to make a component sufficiently apparent to the user. Default value is `33`.

# See also

- [adapt-contrib-pageLevelProgress](https://github.com/adaptlearning/adapt-contrib-pageLevelProgress)
- [adapt-contrib-spoor](https://github.com/adaptlearning/adapt-contrib-spoor)
- [adapt-contrib-trickle](https://github.com/adaptlearning/adapt-contrib-trickle)
