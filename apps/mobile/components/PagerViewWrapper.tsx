import React, { forwardRef } from 'react';
import PagerView, { PagerViewProps } from 'react-native-pager-view';

/** Imperative handle shared with the web implementation. */
export type PagerHandle = {
  setPage: (index: number) => void;
};

const PagerViewWrapper = forwardRef<PagerHandle, PagerViewProps>(
  function PagerViewWrapper(props, ref) {
    // PagerView itself exposes setPage, which matches PagerHandle.
    return <PagerView ref={ref as React.Ref<PagerView>} {...props} />;
  }
);

export default PagerViewWrapper;
