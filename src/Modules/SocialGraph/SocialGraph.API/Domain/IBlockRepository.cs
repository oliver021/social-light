namespace SocialLight.SocialGraph.Domain;

/// <summary>
/// Repository PORT for <c>Block</c> (DESIGN-STRATEGY.md §4). It lives in the
/// module's domain; the module depends on this abstraction, never on the EF adapter
/// or the Postgres binding. Decoupling is by dependency inversion, not folders.
/// </summary>
public interface IBlockRepository
{
    Task<Block> AddAsync(Block block, CancellationToken cancellationToken = default);

    Task<Block?> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Block>> ListAsync(CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
