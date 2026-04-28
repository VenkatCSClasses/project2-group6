import { createYooptaMark, type YooptaMarkProps } from '@yoopta/editor';

export type CommentHighlightValue = {
  commentId: string;
  deleted?: boolean;
};

export const CommentHighlightMark = createYooptaMark<
  YooptaMarkProps<'commentHighlight', CommentHighlightValue>
>({
  type: 'commentHighlight',
  render: (props) => {
    const val = props.leaf.commentHighlight;

    if (!val) {
      return <>{props.children}</>;
    }

    if (val.deleted) {
      return (
        <span
          data-comment-id={val.commentId}
          data-comment-deleted="true"
          style={{
            textDecoration: 'line-through',
            backgroundColor: '#fef08a',
            opacity: 0.55,
            cursor: 'pointer',
          }}
        >
          {props.children}
        </span>
      );
    }

    return (
      <span
        data-comment-id={val.commentId}
        style={{ backgroundColor: '#fef08a', cursor: 'pointer' }}
      >
        {props.children}
      </span>
    );
  },
});
