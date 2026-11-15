import { Children, cloneElement, isValidElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Page from '@/app/(app)/blog/[slug]/page';

const listItemMarkup = new Map<string, string>();
const types = new Map<unknown, number>();

function typeId(type: unknown) {
  if (!types.has(type)) types.set(type, types.size);
  return types.get(type);
}

function markupKey(node: ReactNode) {
  return JSON.stringify(node, (_key, value: unknown) => {
    if (isValidElement(value)) return { type: typeId(value.type), props: value.props };
    if (typeof value === 'function' || typeof value === 'symbol') return { identity: typeId(value) };
    return value;
  });
}

type NodeProps = { children?: ReactNode; dangerouslySetInnerHTML?: { __html: string } };

// Each page repeats the same recommendation cards. Render their complete
// contents once per element type/props, retaining the original list-item props.
// Every page, article, Markdown insertion and CTA still gets a fresh render.
function cacheListItems(node: ReactNode): ReactNode {
  if (Array.isArray(node)) return Children.map(node, cacheListItems);
  if (!isValidElement<NodeProps>(node)) return node;
  if (node.type === 'li') {
    const key = markupKey(node.props.children);
    let html = listItemMarkup.get(key);
    if (html === undefined) {
      html = renderToStaticMarkup(node.props.children);
      listItemMarkup.set(key, html);
    }
    return cloneElement(node, { children: undefined, dangerouslySetInnerHTML: { __html: html } });
  }
  if (node.props.children === undefined) return node;
  return cloneElement(node, { children: cacheListItems(node.props.children) });
}

export async function renderBlogPost(slug: string) {
  const page = await Page({ params: Promise.resolve({ slug }) });
  return renderToStaticMarkup(cacheListItems(page));
}
