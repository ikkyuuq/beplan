import * as React from 'react';
import renderer, { act } from 'react-test-renderer';

import { ThemedText } from '../ThemedText';

it('renders correctly', async () => {
  let tree: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(<ThemedText>Snapshot test!</ThemedText>);
  });

  expect(tree!.toJSON()).toMatchSnapshot();
});
