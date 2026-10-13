import type { APIRoute, GetStaticPaths } from 'astro';
import type { SiteImageFile } from '../../../../lib/chapter-image-copies';
import { getChapterImageCopyFiles } from '../../../../lib/operational-content';

export const prerender = true;

// Writes the site-hosted copies of remote chapter images into the build.
export const getStaticPaths: GetStaticPaths = async () =>
  (await getChapterImageCopyFiles()).map((file) => ({
    params: { file: file.name },
    props: { file },
  }));

export const GET: APIRoute<{ file: SiteImageFile }> = ({ props }) =>
  new Response(props.file.bytes, {
    headers: { 'content-type': props.file.contentType },
  });
