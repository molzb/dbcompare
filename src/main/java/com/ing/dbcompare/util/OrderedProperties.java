package com.ing.dbcompare.util;

import java.util.Collections;
import java.util.Enumeration;
import java.util.LinkedHashSet;
import java.util.Properties;

public class OrderedProperties extends Properties {
    private static final long serialVersionUID = 8469448837798175728L;
    private final LinkedHashSet<Object> keyOrder = new LinkedHashSet<>();

    @Override
    public synchronized Enumeration<Object> keys() {
        return Collections.enumeration(keyOrder);
    }

    @Override
    public synchronized Object put(final Object key, final Object value) {
        keyOrder.add(key);
        return super.put(key, value);
    }
}