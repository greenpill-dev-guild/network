/* hifi/comp-page.jsx — Components page composition. */

const CompApp = ({ bp = 'desktop' }) => (
  <CompPage bp={bp}>
    <Comp_Foundations />
    <Comp_Colors />
    <Comp_Type />
    <Comp_Spacing />
    <Comp_Shadows />
    <Comp_Brand />
    <Comp_Chrome />
    <Comp_Buttons />
    <Comp_Inputs />
    <Comp_Chips />
    <Comp_Meta />
    <Comp_Avatars />
    <Comp_Placeholders />
    <Comp_Cards />
    <Comp_Rows />
    <Comp_Sections />
    <Comp_Heroes />
    <Comp_Article />
    <Comp_Garden />
  </CompPage>
);

Object.assign(window, { CompApp });
