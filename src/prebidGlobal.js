// if $$PREBID_GLOBAL$$ already exists in global document scope, use it, if not, create the object
// global defination should happen BEFORE imports to avoid global undefined errors.
$$PREBID_GLOBAL$$ = ($$PREBID_GLOBAL$$ || {});
$$PREBID_GLOBAL$$.cmd = $$PREBID_GLOBAL$$.cmd || [];
$$PREBID_GLOBAL$$.que = $$PREBID_GLOBAL$$.que || [];

export function getGlobal() {
  return $$PREBID_GLOBAL$$;
}
