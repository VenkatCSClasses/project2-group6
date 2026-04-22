import { buildBlockData, buildBlockElement, type YooptaContentValue } from "@yoopta/editor";

export function createStarterContent(title = "Untitled Document"): YooptaContentValue {
  const heading = buildBlockData({
    type: "HeadingOne",
    value: [buildBlockElement({ children: [{ text: title }] })],
  });
  const intro = buildBlockData({
    type: "Paragraph",
    value: [
      buildBlockElement({
        children: [{ text: "Start writing here. Use the floating toolbar to format text." }],
      }),
    ],
  });
  const notes = buildBlockData({
    type: "Paragraph",
    value: [
      buildBlockElement({
        children: [{ text: "Type / to open the slash menu and insert new blocks." }],
      }),
    ],
  });

  return {
    [heading.id]: heading,
    [intro.id]: intro,
    [notes.id]: notes,
  };
}
