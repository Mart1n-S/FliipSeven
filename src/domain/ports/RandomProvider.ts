/**
 * Port for any source of randomness used by the domain.
 * Implementations must return a uniformly distributed integer
 * in the half-open interval [0, maxExclusive).
 *
 * Allows the domain to stay deterministic and testable.
 */
export interface RandomProvider {
  nextInt(maxExclusive: number): number
}
