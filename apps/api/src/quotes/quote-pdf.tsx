import React from 'react';
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { QuoteArea, QuoteLineItem, QuoteWithAreas } from '@stoneboyz/domain';

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#111827',
    backgroundColor: '#ffffff'
  },
  header: {
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    borderBottomStyle: 'solid'
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 4
  },
  subtitle: {
    fontSize: 11,
    color: '#4b5563'
  },
  section: {
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 8,
    textTransform: 'uppercase',
    color: '#1f2937'
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  detailCard: {
    width: '48%',
    padding: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'solid',
    borderRadius: 4
  },
  detailLabel: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 2
  },
  detailValue: {
    fontSize: 10
  },
  areaCard: {
    padding: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'solid',
    borderRadius: 4,
    marginBottom: 8
  },
  areaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  areaName: {
    fontSize: 11,
    fontWeight: 700
  },
  areaMeta: {
    fontSize: 9,
    color: '#4b5563',
    marginBottom: 2
  },
  table: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderStyle: 'solid'
  },
  tableRow: {
    flexDirection: 'row'
  },
  tableHeader: {
    backgroundColor: '#f3f4f6',
    fontWeight: 700
  },
  tableCell: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    borderRightStyle: 'solid',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    borderBottomStyle: 'solid',
    fontSize: 9
  },
  colStone: {
    width: '20%'
  },
  colArea: {
    width: '14%'
  },
  colDimensions: {
    width: '18%'
  },
  colQty: {
    width: '10%'
  },
  colUnit: {
    width: '12%'
  },
  colLabor: {
    width: '12%'
  },
  colTotal: {
    width: '14%',
    borderRightWidth: 0
  },
  summaryBox: {
    marginLeft: 'auto',
    width: 220,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderStyle: 'solid',
    borderRadius: 4,
    padding: 10
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  summaryTotal: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#d1d5db',
    borderTopStyle: 'solid',
    fontWeight: 700
  },
  bodyText: {
    fontSize: 10,
    lineHeight: 1.5,
    color: '#374151'
  },
  emptyText: {
    fontSize: 10,
    color: '#6b7280'
  }
});

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const formatDate = (value: string | null): string => {
  if (value === null) {
    return '-';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatDateTime = (value: string): string => {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

const formatDimensions = (lineItem: QuoteLineItem): string => {
  const values = [lineItem.lengthIn, lineItem.widthIn, lineItem.thicknessCm].map((value) =>
    value === null || value === undefined ? '-' : String(value)
  );

  return values.join(' x ');
};

const areaDetails = (area: QuoteArea): string => {
  const details = [area.material, area.color, area.edgeProfile].filter(Boolean);
  return details.length > 0 ? details.join(' / ') : '-';
};

interface QuotePdfProps {
  quote: QuoteWithAreas;
  customerName: string;
}

export function QuotePdf({ quote, customerName }: QuotePdfProps) {
  const areaNameById = new Map(quote.areas.map((area) => [area.id, area.name]));

  return (
    <Document
      author="Stoneboyz CRM"
      title={`${quote.quoteNumber} - ${quote.title}`}
      subject={`Quote for ${customerName}`}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Quote {quote.quoteNumber}</Text>
          <Text style={styles.subtitle}>{quote.title}</Text>
          <Text style={styles.subtitle}>Customer: {customerName}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.detailGrid}>
            <View style={styles.detailCard}>
              <Text style={styles.detailLabel}>Status</Text>
              <Text style={styles.detailValue}>{quote.status}</Text>
            </View>
            <View style={styles.detailCard}>
              <Text style={styles.detailLabel}>Valid Until</Text>
              <Text style={styles.detailValue}>{formatDate(quote.validUntil)}</Text>
            </View>
            <View style={styles.detailCard}>
              <Text style={styles.detailLabel}>Created</Text>
              <Text style={styles.detailValue}>{formatDateTime(quote.createdAt)}</Text>
            </View>
            <View style={styles.detailCard}>
              <Text style={styles.detailLabel}>Updated</Text>
              <Text style={styles.detailValue}>{formatDateTime(quote.updatedAt)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Areas</Text>
          {quote.areas.length === 0 ? (
            <Text style={styles.emptyText}>No areas.</Text>
          ) : (
            quote.areas.map((area) => (
              <View key={area.id} style={styles.areaCard}>
                <View style={styles.areaHeader}>
                  <Text style={styles.areaName}>{area.name}</Text>
                  <Text>{money(area.subtotalCents)}</Text>
                </View>
                <Text style={styles.areaMeta}>{areaDetails(area)}</Text>
                <Text style={styles.areaMeta}>Notes: {area.notes ?? '-'}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Line Items</Text>
          {quote.lineItems.length === 0 ? (
            <Text style={styles.emptyText}>No line items.</Text>
          ) : (
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.tableCell, styles.colStone]}>Stone Type</Text>
                <Text style={[styles.tableCell, styles.colArea]}>Area</Text>
                <Text style={[styles.tableCell, styles.colDimensions]}>Dimensions</Text>
                <Text style={[styles.tableCell, styles.colQty]}>Qty</Text>
                <Text style={[styles.tableCell, styles.colUnit]}>Unit</Text>
                <Text style={[styles.tableCell, styles.colLabor]}>Labor</Text>
                <Text style={[styles.tableCell, styles.colTotal]}>Total</Text>
              </View>
              {quote.lineItems.map((lineItem) => (
                <View key={lineItem.id} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.colStone]}>{lineItem.stoneType}</Text>
                  <Text style={[styles.tableCell, styles.colArea]}>
                    {lineItem.quoteAreaId !== null ? areaNameById.get(lineItem.quoteAreaId) ?? '-' : '-'}
                  </Text>
                  <Text style={[styles.tableCell, styles.colDimensions]}>{formatDimensions(lineItem)}</Text>
                  <Text style={[styles.tableCell, styles.colQty]}>
                    {lineItem.qty} {lineItem.qtyUnit}
                  </Text>
                  <Text style={[styles.tableCell, styles.colUnit]}>{money(lineItem.unitPriceCents)}</Text>
                  <Text style={[styles.tableCell, styles.colLabor]}>{money(lineItem.laborPriceCents)}</Text>
                  <Text style={[styles.tableCell, styles.colTotal]}>{money(lineItem.lineTotalCents)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pricing Summary</Text>
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text>Subtotal</Text>
              <Text>{money(quote.subtotalCents)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text>Discount</Text>
              <Text>{money(quote.discountCents)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text>Tax Rate</Text>
              <Text>{(quote.taxRateBps / 100).toFixed(2)}%</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text>Total</Text>
              <Text>{money(quote.totalCents)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={quote.notes ? styles.bodyText : styles.emptyText}>{quote.notes ?? 'No notes provided.'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Terms</Text>
          <Text style={quote.termsAndConditions ? styles.bodyText : styles.emptyText}>
            {quote.termsAndConditions ?? 'No terms provided.'}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
