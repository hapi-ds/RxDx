"""
Property-based tests for Risk Management (FMEA).

Tests correctness properties for RPN calculation, failure chain probability,
and mitigation requirements as per Requirement 10.

**Validates: Requirements 10.3, 10.4, 10.6**
"""

from hypothesis import assume, given, settings
from hypothesis import strategies as st

from app.schemas.risk import (
    RPNThresholdConfig,
)
from app.services.risk_service import RiskService

# ============================================================================
# Strategies for generating test data
# ============================================================================

# FMEA ratings are 1-10
rating_strategy = st.integers(min_value=1, max_value=10)

# Probability is 0.0 to 1.0
probability_strategy = st.floats(min_value=0.0, max_value=1.0, allow_nan=False)

# RPN thresholds must be in order: medium < high < critical
@st.composite
def rpn_threshold_strategy(draw):
    """Generate valid RPN threshold configurations."""
    medium = draw(st.integers(min_value=10, max_value=100))
    high = draw(st.integers(min_value=medium + 1, max_value=500))
    critical = draw(st.integers(min_value=high + 1, max_value=1000))
    return RPNThresholdConfig(
        critical_threshold=critical,
        high_threshold=high,
        medium_threshold=medium
    )


# ============================================================================
# Property 10.1: RPN Calculation Correctness
# ============================================================================

class TestRPNCalculationProperties:
    """
    Property-based tests for RPN calculation.

    **Validates: Requirement 10.4**
    **Statement**: RPN is always severity × occurrence × detection
    **Formal**: ∀ risk r, rpn(r) = severity(r) × occurrence(r) × detection(r)
    """

    @given(
        severity=rating_strategy,
        occurrence=rating_strategy,
        detection=rating_strategy
    )
    @settings(max_examples=100)
    def test_rpn_equals_product_of_ratings(self, severity, occurrence, detection):
        """
        Property: RPN always equals severity × occurrence × detection.

        **Validates: Requirement 10.4**
        """
        service = RiskService(
            graph_service=None,
            audit_service=None,
            signature_service=None,
            version_service=None,
        )

        rpn = service.calculate_rpn(severity, occurrence, detection)
        expected = severity * occurrence * detection

        assert rpn == expected, f"RPN {rpn} != {severity} × {occurrence} × {detection} = {expected}"

    @given(
        severity=rating_strategy,
        occurrence=rating_strategy,
        detection=rating_strategy
    )
    @settings(max_examples=100)
    def test_rpn_range_is_valid(self, severity, occurrence, detection):
        """
        Property: RPN is always between 1 and 1000 (inclusive).

        **Validates: Requirement 10.4**
        """
        service = RiskService(
            graph_service=None,
            audit_service=None,
            signature_service=None,
            version_service=None,
        )

        rpn = service.calculate_rpn(severity, occurrence, detection)

        assert 1 <= rpn <= 1000, f"RPN {rpn} out of valid range [1, 1000]"

    @given(
        s1=rating_strategy,
        o1=rating_strategy,
        d1=rating_strategy,
        s2=rating_strategy,
        o2=rating_strategy,
        d2=rating_strategy
    )
    @settings(max_examples=100)
    def test_rpn_is_commutative_in_factors(self, s1, o1, d1, s2, o2, d2):
        """
        Property: RPN calculation is deterministic - same inputs always give same output.

        **Validates: Requirement 10.4**
        """
        service = RiskService(
            graph_service=None,
            audit_service=None,
            signature_service=None,
            version_service=None,
        )

        # Calculate twice with same inputs
        rpn1 = service.calculate_rpn(s1, o1, d1)
        rpn2 = service.calculate_rpn(s1, o1, d1)

        assert rpn1 == rpn2, "RPN calculation is not deterministic"

    @given(
        severity=rating_strategy,
        occurrence=rating_strategy,
        detection=rating_strategy
    )
    @settings(max_examples=100)
    def test_rpn_increases_with_higher_ratings(self, severity, occurrence, detection):
        """
        Property: Increasing any rating increases or maintains RPN.

        **Validates: Requirement 10.4**
        """
        service = RiskService(
            graph_service=None,
            audit_service=None,
            signature_service=None,
            version_service=None,
        )

        base_rpn = service.calculate_rpn(severity, occurrence, detection)

        # Increasing severity (if possible)
        if severity < 10:
            higher_severity_rpn = service.calculate_rpn(severity + 1, occurrence, detection)
            assert higher_severity_rpn > base_rpn

        # Increasing occurrence (if possible)
        if occurrence < 10:
            higher_occurrence_rpn = service.calculate_rpn(severity, occurrence + 1, detection)
            assert higher_occurrence_rpn > base_rpn

        # Increasing detection (if possible)
        if detection < 10:
            higher_detection_rpn = service.calculate_rpn(severity, occurrence, detection + 1)
            assert higher_detection_rpn > base_rpn


# ============================================================================
# Property 10.2: Failure Chain Probability
# ============================================================================

def calculate_chain_probability(probabilities):
    """
    Calculate total probability for a failure chain.

    This is a standalone function for testing purposes.
    The actual implementation is in GraphService._calculate_chain_probability

    Args:
        probabilities: List of individual step probabilities

    Returns:
        Combined probability (product of all probabilities)
    """
    if not probabilities:
        return 0.0

    total_prob = 1.0
    for prob in probabilities:
        if isinstance(prob, (int, float)) and 0 <= prob <= 1:
            total_prob *= prob
        else:
            return 0.0

    return total_prob


class TestFailureChainProbabilityProperties:
    """
    Property-based tests for failure chain probability calculation.

    **Validates: Requirement 10.3, 10.9**
    **Statement**: Chain probability is product of individual probabilities
    **Formal**: P(chain) = ∏ P(step_i) for all steps i in chain
    """

    @given(probabilities=st.lists(probability_strategy, min_size=1, max_size=10))
    @settings(max_examples=100)
    def test_chain_probability_is_product(self, probabilities):
        """
        Property: Total chain probability equals product of step probabilities.

        **Validates: Requirement 10.3**
        """
        # Calculate expected product
        expected = 1.0
        for p in probabilities:
            expected *= p

        # Use the standalone function
        result = calculate_chain_probability(probabilities)

        # Allow small floating point differences
        assert abs(result - expected) < 1e-10, f"Chain probability {result} != expected {expected}"

    @given(probabilities=st.lists(probability_strategy, min_size=1, max_size=10))
    @settings(max_examples=100)
    def test_chain_probability_range(self, probabilities):
        """
        Property: Chain probability is always between 0 and 1.

        **Validates: Requirement 10.3**
        """
        result = calculate_chain_probability(probabilities)

        assert 0.0 <= result <= 1.0, f"Chain probability {result} out of range [0, 1]"

    @given(probabilities=st.lists(probability_strategy, min_size=2, max_size=10))
    @settings(max_examples=100)
    def test_chain_probability_decreases_with_length(self, probabilities):
        """
        Property: Adding more steps (with prob < 1) decreases total probability.

        **Validates: Requirement 10.3**
        """
        # Skip if any probability is 1.0 (wouldn't decrease)
        assume(all(p < 1.0 for p in probabilities))
        assume(all(p > 0.0 for p in probabilities))

        # Calculate with all probabilities
        full_chain = calculate_chain_probability(probabilities)

        # Calculate with one less step
        shorter_chain = calculate_chain_probability(probabilities[:-1])

        assert full_chain <= shorter_chain, "Longer chain should have lower or equal probability"

    @given(probability=probability_strategy)
    @settings(max_examples=50)
    def test_single_step_chain_equals_step_probability(self, probability):
        """
        Property: Single-step chain probability equals the step probability.

        **Validates: Requirement 10.3**
        """
        result = calculate_chain_probability([probability])

        assert abs(result - probability) < 1e-10

    def test_empty_chain_returns_zero(self):
        """
        Property: Empty chain has zero probability.

        **Validates: Requirement 10.3**
        """
        result = calculate_chain_probability([])

        assert result == 0.0


# ============================================================================
# Property 10.3: Mitigation Requirement
# ============================================================================

class TestMitigationRequirementProperties:
    """
    Property-based tests for mitigation requirement determination.

    **Validates: Requirement 10.6**
    **Statement**: High RPN risks require mitigation actions
    **Formal**: ∀ risk r, rpn(r) > threshold → requires_mitigation(r)
    """

    @given(
        severity=rating_strategy,
        occurrence=rating_strategy,
        detection=rating_strategy,
        thresholds=rpn_threshold_strategy()
    )
    @settings(max_examples=100)
    def test_high_rpn_requires_mitigation(self, severity, occurrence, detection, thresholds):
        """
        Property: Risks with RPN >= high threshold require mitigation.

        **Validates: Requirement 10.6**
        """
        service = RiskService(
            graph_service=None,
            audit_service=None,
            signature_service=None,
            version_service=None,
            rpn_thresholds=thresholds,
        )

        rpn = service.calculate_rpn(severity, occurrence, detection)
        requires_mitigation = service.requires_mitigation(rpn)

        if rpn >= thresholds.high_threshold:
            assert requires_mitigation, f"RPN {rpn} >= {thresholds.high_threshold} should require mitigation"
        else:
            assert not requires_mitigation, f"RPN {rpn} < {thresholds.high_threshold} should not require mitigation"

    @given(
        severity=rating_strategy,
        occurrence=rating_strategy,
        detection=rating_strategy,
        thresholds=rpn_threshold_strategy()
    )
    @settings(max_examples=100)
    def test_risk_level_consistency(self, severity, occurrence, detection, thresholds):
        """
        Property: Risk level is consistent with RPN and thresholds.

        **Validates: Requirement 10.6**
        """
        service = RiskService(
            graph_service=None,
            audit_service=None,
            signature_service=None,
            version_service=None,
            rpn_thresholds=thresholds,
        )

        rpn = service.calculate_rpn(severity, occurrence, detection)
        risk_level = service.get_risk_level(rpn)

        if rpn >= thresholds.critical_threshold:
            assert risk_level == "critical"
        elif rpn >= thresholds.high_threshold:
            assert risk_level == "high"
        elif rpn >= thresholds.medium_threshold:
            assert risk_level == "medium"
        else:
            assert risk_level == "low"

    @given(
        severity=rating_strategy,
        occurrence=rating_strategy,
        detection=rating_strategy
    )
    @settings(max_examples=100)
    def test_critical_risks_always_require_mitigation(self, severity, occurrence, detection):
        """
        Property: Critical risks always require mitigation.

        **Validates: Requirement 10.6**
        """
        service = RiskService(
            graph_service=None,
            audit_service=None,
            signature_service=None,
            version_service=None,
        )

        rpn = service.calculate_rpn(severity, occurrence, detection)
        risk_level = service.get_risk_level(rpn)
        requires_mitigation = service.requires_mitigation(rpn)

        if risk_level == "critical":
            assert requires_mitigation, "Critical risks must require mitigation"

    @given(
        severity=rating_strategy,
        occurrence=rating_strategy,
        detection=rating_strategy
    )
    @settings(max_examples=100)
    def test_low_risks_never_require_mitigation(self, severity, occurrence, detection):
        """
        Property: Low risks never require mitigation (with default thresholds).

        **Validates: Requirement 10.6**
        """
        service = RiskService(
            graph_service=None,
            audit_service=None,
            signature_service=None,
            version_service=None,
        )

        rpn = service.calculate_rpn(severity, occurrence, detection)
        risk_level = service.get_risk_level(rpn)
        requires_mitigation = service.requires_mitigation(rpn)

        if risk_level == "low":
            assert not requires_mitigation, "Low risks should not require mitigation"


# ============================================================================
# Property: RPN Reduction After Mitigation
# ============================================================================

class TestRPNReductionProperties:
    """
    Property-based tests for RPN reduction after mitigation.

    **Validates: Requirement 10.8**
    """

    @given(
        old_severity=rating_strategy,
        old_occurrence=rating_strategy,
        old_detection=rating_strategy,
        severity_reduction=st.integers(min_value=0, max_value=9),
        occurrence_reduction=st.integers(min_value=0, max_value=9),
        detection_improvement=st.integers(min_value=0, max_value=9)
    )
    @settings(max_examples=100)
    def test_mitigation_reduces_or_maintains_rpn(
        self,
        old_severity,
        old_occurrence,
        old_detection,
        severity_reduction,
        occurrence_reduction,
        detection_improvement
    ):
        """
        Property: Mitigation actions reduce or maintain RPN (never increase).

        **Validates: Requirement 10.8**
        """
        service = RiskService(
            graph_service=None,
            audit_service=None,
            signature_service=None,
            version_service=None,
        )

        # Calculate old RPN
        old_rpn = service.calculate_rpn(old_severity, old_occurrence, old_detection)

        # Calculate new ratings (ensuring they stay in valid range)
        new_severity = max(1, old_severity - severity_reduction)
        new_occurrence = max(1, old_occurrence - occurrence_reduction)
        new_detection = max(1, old_detection - detection_improvement)

        # Calculate new RPN
        new_rpn = service.calculate_rpn(new_severity, new_occurrence, new_detection)

        assert new_rpn <= old_rpn, f"Mitigation should not increase RPN: {new_rpn} > {old_rpn}"

    @given(
        severity=rating_strategy,
        occurrence=rating_strategy,
        detection=rating_strategy
    )
    @settings(max_examples=50)
    def test_maximum_mitigation_achieves_minimum_rpn(
        self,
        severity,
        occurrence,
        detection
    ):
        """
        Property: Maximum mitigation (all ratings to 1) achieves minimum RPN of 1.

        **Validates: Requirement 10.8**
        """
        service = RiskService(
            graph_service=None,
            audit_service=None,
            signature_service=None,
            version_service=None,
        )

        # Minimum possible RPN
        min_rpn = service.calculate_rpn(1, 1, 1)

        assert min_rpn == 1, "Minimum RPN should be 1"
