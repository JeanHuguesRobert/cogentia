-- seed first thesis: Cogentia Commons
insert into theses (title, core_question, forbidden_confusions, expected_audiences, epistemic_status)
values (
  'Cogentia Commons',
  'How can collaborative exploration remain scientifically disciplined without collapsing into epistemic populism?',
  array['donations indicate truth','reputation determines validity'],
  array['researchers','civic actors','funders'],
  'operational proposal'
)
on conflict do nothing;
