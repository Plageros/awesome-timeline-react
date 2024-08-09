# Awesome Timeline React

## Introduction

**Awesome Timeline React** is a component that developers can include in their projects. It provides a Gantt timeline for visualizing and managing events. With simple configuration, powerful performance, and customization options, it's an excellent choice for your project. The component is not published yet; it will be released as a beta version first. If you have any ideas for features or encounter any bugs, please email me at [jakub.plata@yahoo.pl](mailto:jakub.plata@yahoo.pl).

![](https://raw.githubusercontent.com/Plageros/awesome-timeline-react/master/public/gifs/demo-overview.gif)

## Ladle

To run ladle stories, type:

```sh
npm run ladle
```

## Configuration

First, import the `Timeline` component into your project. The following properties are available:

- `rows` – an array of objects that define rows. The order within the array will be preserved in the Timeline.

- `events` – an array of objects that define events assigned to particular rows. Each object includes:

  - `id`: `string`
  - `rowId`: `string`
  - `startTime`: `number` (timestamp in seconds)
  - `endTime`: `number` (timestamp in seconds)
  - `props`:
    - `isLocked`: `boolean` (defines if the event is locked, meaning it cannot be moved. Default is `false`)
    - `content`: `JSX.Element | string` (customizable content for each event)
    - `classNames`: `string[]` (array of additional class names for customizing the event)

- `staticEvents` – an array of objects that define static events for particular rows, meaning the events are not interactable by the user.

- `onDrop` – an external callback for the `onDrop` event that can be injected. The callback receives the following properties:

  - `eventId`: `string`
  - `oldRowId`: `string`
  - `newRowId`: `string`
  - `startDate`: `number` (timestamp in seconds)
  - `endDate`: `number` (timestamp in seconds)

- `additionalClassNames` – contains additional class names that will be included within elements:
  - `timeBar`: `string`
  - `dayRow`: `string`
  - `hourRow`: `string`
  - `line`: `string`
  - `rowsHeader`: `string`

## Awesome Features

One of the awesome features (currently hidden from the interface) is adjusting the granulation of the grid. To achieve this, click the wheel on the mouse. This will hide the scroll bar, and you can adjust the grid granulation by scrolling the wheel. Each scroll iteration adjusts the grid by ±15 minutes, depending on the scroll direction.

![](https://raw.githubusercontent.com/Plageros/awesome-timeline-react/master/public/gifs/demo-grid-granulation.gif)

## Roadmap

Here, we will store major features planned for future releases (from highest to lowest priority):

1. Resize events
2. Real time line
3. Customizable prompts after hovering over an event
4. Customizable second row of the time bar
5. Intersection observer with `display: none` property to further improve performance