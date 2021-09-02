package com.ing.dbcompare.util;

import static org.junit.Assert.assertEquals;

import java.util.Arrays;
import java.util.List;

import org.junit.Test;

public class JsonTest {
    @Test
    public void toJsonArray() {
        List<Boolean> bools = Arrays.asList(true, false, true, false, true);
        var actual = new Json().toJsonArray(bools);
        assertEquals("[true,false,true,false,true]", actual);
    }
}