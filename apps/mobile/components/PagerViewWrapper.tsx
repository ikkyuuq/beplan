import React from 'react';
import PagerView, { PagerViewProps } from 'react-native-pager-view';

export default function PagerViewWrapper(props: PagerViewProps) {
  return <PagerView {...props} />;
}
